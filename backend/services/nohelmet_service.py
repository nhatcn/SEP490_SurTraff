import os
import cv2
import numpy as np
import json
import time
import traceback
from datetime import datetime
from collections import deque
from ultralytics import YOLO
import requests
import easyocr
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from utils.yt_stream import get_stream_url

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
FRAME_RATE = 30  # FPS
STANDARD_WIDTH = 640
STANDARD_HEIGHT = 480
ROI_SCALE = 1.5  # Scale vùng đầu
MIN_HEAD_SIZE = 20  # Kích thước tối thiểu vùng đầu (pixel)

# Load models
model_vehicle = YOLO("yolov8m.pt")
model_license_plate = YOLO("best90.pt")
model_helmet = YOLO("helmet_yolov8.pt")  # Model YOLOv8 với lớp "helmet", "no helmet", "LP"

ocr_reader = easyocr.Reader(['en'], gpu=False)

def fetch_camera_config(cid: int, retries=3, delay=1):
    """
    Fetch camera configuration from Spring Boot API
    """
    url = f"http://localhost:8081/api/cameras/{cid}"
    for attempt in range(retries):
        try:
            res = requests.get(url)
            res.raise_for_status()
            return res.json()
        except Exception as e:
            print(f"Retry {attempt+1}/{retries}: Error fetching zones: {e}")
            time.sleep(delay)
    raise ValueError("Failed to fetch camera config after retries")

def extract_license_plate(frame, boxes, vehicle_box):
    """
    Extract license plate text
    """
    x1_v, y1_v, x2_v, y2_v = vehicle_box
    cx_v, cy_v = (x1_v + x2_v) / 2, (y1_v + y2_v) / 2
    license_plate_text = "Unknown"
    
    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        if (abs(cx - cx_v) < (x2_v - x1_v) / 1.5 and abs(cy - cy_v) < (y2_v - y1_v) / 1.5):
            plate_roi = frame[y1:y2, x1:x2]
            if plate_roi.size > 0:
                try:
                    plate_roi = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
                    plate_roi = cv2.equalizeHist(plate_roi)
                    ocr_results = ocr_reader.readtext(plate_roi, detail=0)
                    license_plate_text = ocr_results[0] if ocr_results else "Unknown"
                    license_plate_text = "".join(c for c in license_plate_text if c.isalnum()).upper()
                except Exception as e:
                    print(f"Error in OCR: {e}")
                    license_plate_text = "Unknown"
            break
    return license_plate_text

def stream_no_helmet_service(youtube_url: str, camera_id: int, db=None):
    camera_config = fetch_camera_config(camera_id)
    if not camera_config:
        raise ValueError("Could not fetch camera config")

    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError(f"❌ Cannot open stream from {stream_url}")

    vehicle_violations = {}
    frame_buffer = deque(maxlen=30)
    recording_tasks = {}

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_annotated = frame.copy()
            frame_for_video = frame.copy()
            h, w, _ = frame.shape

            plate_results = model_license_plate(frame, conf=0.4, iou=0.4)[0]
            plate_boxes = plate_results.boxes if plate_results.boxes is not None else []

            helmet_results = model_helmet(frame, conf=0.4, iou=0.4)[0]
            helmet_boxes = helmet_results.boxes if helmet_results.boxes is not None else []

            results = model_vehicle.track(source=frame, persist=True, conf=0.4, iou=0.4, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
                frame_buffer.append(frame_for_video.copy())
                continue

            active_track_ids = set()
            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = model_vehicle.names[cls_id]
                if class_name != 'motorbike':  # Chỉ xử lý xe máy
                    continue

                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                track_id = int(results.boxes.id[i])
                active_track_ids.add(track_id)

                license_plate_text = extract_license_plate(frame, plate_boxes, (x1, y1, x2, y2))
                head_height = int((y2 - y1) / 3 * ROI_SCALE)
                head_width = int((x2 - x1) * ROI_SCALE)
                head_x1 = max(0, int(x1 - (head_width - (x2 - x1)) / 2))
                head_y1 = max(0, y1)
                head_x2 = min(w, head_x1 + head_width)
                head_y2 = min(h, head_y1 + head_height)

                no_helmet = False
                if head_x2 > head_x1 and head_y2 > head_y1:
                    for box in helmet_boxes:
                        hx1, hy1, hx2, hy2 = map(int, box.xyxy[0])
                        hcx, hcy = (hx1 + hx2) / 2, (hy1 + hy2) / 2
                        if (abs(hcx - cx) < head_width / 1.5 and abs(hcy - cy) < head_height / 1.5):
                            cls_id = int(box.cls)
                            class_name = model_helmet.names[cls_id]
                            if class_name == 'no_helmet':
                                no_helmet = True
                            break

                if no_helmet and track_id not in vehicle_violations:
                    vehicle_violations[track_id] = "NO_HELMET"
                    print(f"NO HELMET VIOLATION: Vehicle {track_id} (motorbike), Plate: {license_plate_text}")

                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_filename = f"no_helmet_{track_id}_{timestamp}.jpg"
                    snapshot_filepath = os.path.join(VIOLATIONS_DIR, snapshot_filename)
                    cv2.imwrite(snapshot_filepath, frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    video_filename = f"no_helmet_{track_id}_{timestamp}.mp4"
                    video_filepath = os.path.join(VIOLATIONS_DIR, video_filename)
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    writer = cv2.VideoWriter(video_filepath, fourcc, FRAME_RATE, (w, h))
                    for buf_frame in frame_buffer:
                        writer.write(buf_frame)
                    recording_tasks[track_id] = {
                        'writer': writer,
                        'frames_remaining': 30,
                        'file_path': video_filepath
                    }

                    # Gọi API POST /api/violations
                    violation_data = {
                        "camera": {"id": camera_id},
                        "vehicle": {"licensePlate": license_plate_text},
                        "vehicleType": {"id": 1},  # Giả định ID 1 cho motorbike
                        "createdAt": datetime.now().isoformat(),
                        "status": "PENDING",
                        "violationDetails": [
                            {
                                "violationTypeId": 1,  # Giả định ID 1 cho NO_HELMET
                                "location": "Unknown",
                                "violationTime": datetime.now().isoformat(),
                                "additionalNotes": f"Track ID: {track_id}"
                            }
                        ]
                    }

                    try:
                        with open(snapshot_filepath, "rb") as img_file, open(video_filepath, "rb") as vid_file:
                            files = {
                                "imageFile": (snapshot_filename, img_file, "image/jpeg"),
                                "videoFile": (video_filename, vid_file, "video/mp4")
                            }
                            data = {"Violation": json.dumps(violation_data)}
                            response = requests.post(
                                "http://localhost:8081/api/violations",
                                files=files,
                                data=data
                            )
                            response.raise_for_status()
                            print(f"Violation saved to API: {response.json()}")
                    except Exception as e:
                        print(f"Error saving violation to API: {e}")

                color = (0, 0, 255) if vehicle_violations.get(track_id, False) else (0, 255, 0)
                label = f"ID:{track_id} {class_name} Plate: {license_plate_text} {'NO HELMET' if no_helmet else 'OK'}"
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                if head_x2 > head_x1 and head_y2 > head_y1:
                    cv2.rectangle(frame_annotated, (head_x1, head_y1), (head_x2, head_y2), color, 1)

            frame_buffer.append(frame_for_video.copy())

            for track_id in list(recording_tasks.keys()):
                task = recording_tasks[track_id]
                if task['frames_remaining'] > 0:
                    task['writer'].write(frame_for_video)
                    task['frames_remaining'] -= 1
                else:
                    task['writer'].release()
                    del recording_tasks[track_id]

            for track_id in list(vehicle_violations.keys()):
                if track_id not in active_track_ids:
                    vehicle_violations.pop(track_id, None)

            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    except Exception as e:
        print(f"Error in stream_no_helmet_service: {e}")
        traceback.print_exc()
    finally:
        cap.release()
        for task in recording_tasks.values():
            task['writer'].release()

if __name__ == "__main__":
    app = FastAPI()

    @app.get("/stream/no-helmet/{camera_id}")
    async def stream_no_helmet(camera_id: int, youtube_url: str = "YOUR_YOUTUBE_STREAM_URL"):
        return StreamingResponse(
            stream_no_helmet_service(youtube_url, camera_id),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )