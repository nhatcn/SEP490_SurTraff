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
from filterpy.kalman import KalmanFilter
from utils.yt_stream import get_stream_url
from concurrent.futures import ThreadPoolExecutor
import atexit

# Constants
VIOLATIONS_DIR = "overspeed_violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
FRAME_RATE = 30  # FPS
STANDARD_WIDTH = 640
STANDARD_HEIGHT = 480
SPEED_LIMIT = 60  # km/h
MIN_VEHICLE_SIZE = 50  # Minimum vehicle bounding box size (pixels)
DISTANCE_REF = 10  # Reference real-world distance (meters)
PIXEL_REF = 100  # Corresponding pixel distance
VIOLATION_API_URL = "http://localhost:8081/api/violations"

# Load YOLOv8m model
model = YOLO("yolov8m.pt")

# Define class names mapping
class_names = {
    2: "car",
    3: "motorbike",
    5: "bus",
    7: "truck",
}

# Initialize EasyOCR
ocr_reader = easyocr.Reader(['en'], gpu=True)

# Initialize FastAPI
app = FastAPI()

# Thread pool for async violation sending
violation_executor = ThreadPoolExecutor(max_workers=5)

def initialize_kalman_filter():
    """Initialize Kalman Filter for tracking position and velocity."""
    kf = KalmanFilter(dim_x=4, dim_z=2)  # State: [x, y, vx, vy], Measurement: [x, y]
    kf.F = np.array([[1, 0, 1, 0],  # State transition matrix
                     [0, 1, 0, 1],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]])
    kf.H = np.array([[1, 0, 0, 0],  # Measurement function
                     [0, 1, 0, 0]])
    kf.P *= 1000.0  # Initial covariance
    kf.R = np.array([[5, 0], [0, 5]])  # Measurement noise
    kf.Q = np.eye(4) * 0.1  # Process noise
    return kf

def fetch_camera_config(cid: int, retries=3, delay=1):
    """Fetch camera configuration from Spring Boot API."""
    url = f"http://localhost:8081/api/cameras/{cid}"
    for attempt in range(retries):
        try:
            res = requests.get(url)
            res.raise_for_status()
            return res.json()
        except Exception as e:
            print(f"Retry {attempt+1}/{retries}: Error fetching camera config: {e}")
            time.sleep(delay)
    raise ValueError("Failed to fetch camera config after retries")

def extract_license_plate(frame, boxes):
    """Extract license plate text using EasyOCR."""
    license_plate_text = "Unknown"
    for box in boxes:
        if class_names.get(int(box.cls), model.names[int(box.cls)]) == "number_plate":
            x1, y1, x2, y2 = map(int, box.xyxy[0])
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
            break
    return license_plate_text

def calculate_speed(kf, frame_time, pixel_to_meter):
    """Calculate speed in km/h using Kalman Filter velocity estimates."""
    velocity = kf.x[2:4]  # [vx, vy]
    pixel_speed = np.sqrt(velocity[0]**2 + velocity[1]**2)
    meters_per_second = pixel_speed * pixel_to_meter
    km_per_hour = meters_per_second * 3.6  # Convert m/s to km/h
    return km_per_hour

def send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id):
    """Send violation data to API asynchronously and delete files after sending."""
    def send_violation():
        try:
            with open(snapshot_filepath, 'rb') as img_file, open(video_filepath, 'rb') as vid_file:
                files = {
                    'imageFile': (os.path.basename(snapshot_filepath), img_file, 'image/jpeg'),
                    'videoFile': (os.path.basename(video_filepath), vid_file, 'video/mp4'),
                    'Violation': (None, json.dumps(violation_data), 'application/json')
                }
                response = requests.post(VIOLATION_API_URL, files=files, timeout=10)
                response.raise_for_status()
                print(f"[+] Violation sent successfully for track {track_id}: {response.status_code}")
        except Exception as e:
            print(f"[-] Failed to send violation to API for track {track_id}: {e}")
        finally:
            for filepath in [snapshot_filepath, video_filepath]:
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        print(f"[+] Deleted file: {filepath}")
                except Exception as e:
                    print(f"[-] Failed to delete file {filepath}: {e}")

    violation_executor.submit(send_violation)

def stream_overspeed_service(youtube_url: str, camera_id: int):
    """Stream video and detect overspeed violations."""
    print(f"Loaded model classes: {model.names}")
    
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
    kalman_filters = {}
    pixel_to_meter = DISTANCE_REF / PIXEL_REF
    frame_time = 1.0 / FRAME_RATE

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

            results = model.track(source=frame, persist=True, conf=0.5, iou=0.5, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
                frame_buffer.append(frame_for_video.copy())
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])[1].tobytes() + b"\r\n"
                )
                continue

            active_track_ids = set()
            vehicle_boxes = []
            plate_boxes = []

            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = class_names.get(cls_id, model.names[cls_id])
                if class_name not in class_names.values():
                    continue

                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                track_id = int(results.boxes.id[i])
                active_track_ids.add(track_id)

                if (x2 - x1) < MIN_VEHICLE_SIZE or (y2 - y1) < MIN_VEHICLE_SIZE:
                    continue

                vehicle_boxes.append((x1, y1, x2, y2, track_id, class_name))
                if class_name == "number_plate":
                    plate_boxes.append(results.boxes[i])

            license_plate_text = extract_license_plate(frame, plate_boxes)

            for x1, y1, x2, y2, track_id, class_name in vehicle_boxes:
                if track_id not in kalman_filters:
                    kalman_filters[track_id] = initialize_kalman_filter()

                kf = kalman_filters[track_id]
                center_x, center_y = (x1 + x2) / 2, (y1 + y2) / 2

                kf.predict()
                kf.update(np.array([[center_x], [center_y]]))

                speed = calculate_speed(kf, frame_time, pixel_to_meter)
                is_violation = speed > SPEED_LIMIT

                if is_violation and track_id not in vehicle_violations and track_id not in recording_tasks:
                    vehicle_violations[track_id] = "OVERSPEED"
                    print(f"[+] OVERSPEED VIOLATION: Vehicle {track_id}, Plate: {license_plate_text}, Speed: {speed:.2f} km/h")

                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_filename = f"overspeed_{track_id}_{timestamp}.jpg"
                    snapshot_filepath = os.path.join(VIOLATIONS_DIR, snapshot_filename)
                    cv2.imwrite(snapshot_filepath, frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    video_filename = f"overspeed_{track_id}_{timestamp}.mp4"
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

                    violation_data = {
                        "camera": {"id": camera_id},
                        "vehicle": {"licensePlate": license_plate_text},
                        "vehicleType": {"id": 1},
                        "createdAt": datetime.now().isoformat(),
                        "status": "PENDING",
                        "violationDetails": [
                            {
                                "violationTypeId": 2,
                                "location": "Unknown",
                                "violationTime": datetime.now().isoformat(),
                                "additionalNotes": f"Track ID: {track_id}, Speed: {speed:.2f} km/h"
                            }
                        ]
                    }

                    print(f"[+] Sending OVERSPEED violation for track {track_id} asynchronously...")
                    send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id)

                # Set bounding box color based on speed violation
                color = (0, 0, 255) if is_violation else (0, 255, 0)
                label = f"ID:{track_id} {class_name} Plate: {license_plate_text} Speed: {speed:.2f} km/h"
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

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
                    kalman_filters.pop(track_id, None)

            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    except Exception as e:
        print(f"[-] Error in stream_overspeed_service: {e}")
        traceback.print_exc()
    finally:
        cap.release()
        for task in recording_tasks.values():
            task['writer'].release()
        print("[+] Closed stream for camera")

def cleanup_on_exit():
    """Clean up thread pool on exit."""
    print("[+] Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("[+] Violation executor shutdown complete")

atexit.register(cleanup_on_exit)