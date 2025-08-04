import os
import cv2
import numpy as np
import json
import time
import traceback
from datetime import datetime
from collections import deque
from ultralytics import YOLO
import aiohttp
import asyncio
from concurrent.futures import ThreadPoolExecutor
import atexit
from contextlib import ExitStack
from utils.yt_stream import get_stream_url

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
FRAME_RATE = 30  # FPS
ROI_SCALE = 1.5  # Scale vùng đầu
MIN_HEAD_SIZE = 20  # Kích thước tối thiểu vùng đầu (pixel)
RECONNECT_ATTEMPTS = 3
RECONNECT_DELAY = 1
VIOLATION_API_URL = "http://localhost:8081/api/violations"

# Load the YOLO model
model = YOLO("besthl.pt")  # Thay bằng path đến model của bạn

# Define class names mapping
class_names = {
    0: "helmet",
    1: "LP",
    2: "no helmet"
}

# Thread pool for async violation sending
violation_executor = ThreadPoolExecutor(max_workers=5)

async def fetch_camera_config(cid: int, retries=3, delay=1):
    """
    Lấy cấu hình camera từ API Spring Boot
    """
    url = f"http://localhost:8081/api/cameras/{cid}"
    async with aiohttp.ClientSession() as session:
        for attempt in range(1, retries + 1):
            try:
                async with session.get(url, timeout=10) as response:
                    response.raise_for_status()
                    return await response.json()
            except Exception as e:
                print(f"[-] Retry {attempt}/{retries}: Error fetching camera config: {str(e)}")
                if attempt == retries:
                    raise RuntimeError(f"Failed to fetch camera config after {retries} retries: {e}")
                await asyncio.sleep(delay)

def send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id):
    """
    Gửi dữ liệu vi phạm đến API bất đồng bộ
    """
    def send_violation():
        with ExitStack() as stack:
            try:
                img_file = stack.enter_context(open(snapshot_filepath, 'rb'))
                vid_file = stack.enter_context(open(video_filepath, 'rb'))
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
                stack.callback(lambda: os.remove(snapshot_filepath) if os.path.exists(snapshot_filepath) else None)
                stack.callback(lambda: os.remove(video_filepath) if os.path.exists(video_filepath) else None)
                print(f"[+] Cleaned up temp files for track {track_id}")

    violation_executor.submit(send_violation)

def stream_no_helmet_service(youtube_url: str, camera_id: int):
    """
    Stream video và phát hiện vi phạm không đội mũ bảo hiểm
    """
    print(f"[+] Starting stream_no_helmet_service for camera {camera_id}: {youtube_url}")
    print(f"[+] Loaded model classes: {model.names}")

    # Handle YouTube URL
    stream_url = youtube_url
    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        try:
            stream_url = get_stream_url(youtube_url)
            print(f"[+] Converted YouTube URL to stream: {stream_url}")
        except Exception as e:
            print(f"[-] Cannot convert YouTube URL: {str(e)}")
            raise ValueError(f"Cannot convert YouTube URL: {str(e)}")

    # Fetch camera config
    try:
        camera_config = asyncio.run(fetch_camera_config(camera_id))
        if not camera_config:
            print("[-] Failed to fetch camera config")
            raise ValueError("Could not fetch camera config")
    except Exception as e:
        print(f"[-] Failed to fetch camera config: {str(e)}")
        raise

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"[-] Cannot open stream: {stream_url}")
        cap.release()
        raise ValueError(f"Cannot open stream: {stream_url}")

    vehicle_violations = {}
    frame_buffer = deque(maxlen=30)  # Buffer 30 khung hình
    recording_tasks = {}
    reconnect_attempts = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None or frame.size == 0:
                print(f"[-] Cannot read frame, retrying (attempt {reconnect_attempts + 1}/{RECONNECT_ATTEMPTS})...")
                cap.release()
                reconnect_attempts += 1
                if reconnect_attempts >= RECONNECT_ATTEMPTS:
                    raise RuntimeError(f"Max reconnect attempts reached: {RECONNECT_ATTEMPTS}")
                time.sleep(RECONNECT_DELAY)
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    print(f"[-] Failed to reconnect to stream: {stream_url}")
                    continue
                reconnect_attempts = 0
                continue

            frame_annotated = frame.copy()
            frame_for_video = frame.copy()
            h, w, _ = frame.shape

            # YOLO tracking
            try:
                results = model.track(source=frame, persist=True, conf=0.4, iou=0.4, tracker="bytetrack.yaml")[0]
            except Exception as e:
                print(f"[-] YOLO tracking error: {str(e)}")
                frame_buffer.append(frame_for_video.copy())
                ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret and jpeg is not None:
                    yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
                continue

            if results.boxes is None or results.boxes.id is None:
                frame_buffer.append(frame_for_video.copy())
                ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret and jpeg is not None:
                    yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
                continue

            active_track_ids = set()
            rider_boxes = []
            plate_boxes = []

            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = class_names.get(cls_id, model.names[cls_id])
                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                track_id = int(results.boxes.id[i])
                active_track_ids.add(track_id)

                if class_name == "helmet" or class_name == "no helmet":
                    rider_boxes.append((x1, y1, x2, y2, track_id))
                elif class_name == "LP":
                    plate_boxes.append(results.boxes[i])

            license_plate_text = "Unknown"  # Placeholder since EasyOCR is disabled

            for x1, y1, x2, y2, track_id in rider_boxes:
                head_height = int((y2 - y1) / 3 * ROI_SCALE)
                head_width = int((x2 - x1) * ROI_SCALE)
                head_x1 = max(0, int(x1 - (head_width - (x2 - x1)) / 2))
                head_y1 = max(0, y1)
                head_x2 = min(w, head_x1 + head_width)
                head_y2 = min(h, head_y1 + head_height)

                no_helmet = False
                if head_x2 > head_x1 and head_y2 > head_y1 and (head_x2 - head_x1) >= MIN_HEAD_SIZE and (head_y2 - head_y1) >= MIN_HEAD_SIZE:
                    for box in results.boxes:
                        cls_id = int(box.cls)
                        if class_names.get(cls_id, model.names[cls_id]) in ["helmet", "no helmet"]:
                            hx1, hy1, hx2, hy2 = map(int, box.xyxy[0])
                            hcx, hcy = (hx1 + hx2) / 2, (hy1 + hy2) / 2
                            if (abs(hcx - ((x1 + x2) / 2)) < head_width / 1.5 and 
                                abs(hcy - ((y1 + y2) / 2)) < head_height / 1.5):
                                if class_names.get(cls_id, model.names[cls_id]) == "no helmet":
                                    no_helmet = True
                                break

                if no_helmet and track_id not in vehicle_violations and track_id not in recording_tasks:
                    vehicle_violations[track_id] = {"status": "NO_HELMET", "last_seen": time.time()}
                    print(f"[+] NO HELMET VIOLATION: Rider {track_id}, Plate: {license_plate_text}")

                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_filename = f"no_helmet_{track_id}_{timestamp}.jpg"
                    snapshot_filepath = os.path.join(VIOLATIONS_DIR, snapshot_filename)
                    cv2.imwrite(snapshot_filepath, frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    video_filename = f"no_helmet_{track_id}_{timestamp}.mp4"
                    video_filepath = os.path.join(VIOLATIONS_DIR, video_filename)
                    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                    writer = cv2.VideoWriter(video_filepath, fourcc, FRAME_RATE, (w, h))
                    for buf_frame in frame_buffer:
                        writer.write(buf_frame)
                    recording_tasks[track_id] = {
                        "writer": writer,
                        "frames_remaining": 30,
                        "file_path": video_filepath
                    }

                    violation_data = {
                        "camera": {"id": camera_id},
                        "vehicle": {"licensePlate": license_plate_text},
                        "vehicleType": {"id": 1},  # Giả định ID 1 cho motorbike
                        "createdAt": datetime.now().isoformat(),
                        "status": "PENDING",
                        "violationDetails": [
                            {
                                "violationTypeId": 5,  # Giả định ID 1 cho NO_HELMET
                                "location": "Unknown",
                                "violationTime": datetime.now().isoformat(),
                                "additionalNotes": f"Track ID: {track_id}"
                            }
                        ]
                    }

                    print(f"[+] Sending NO_HELMET violation for track {track_id} asynchronously...")
                    send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id)

                color = (0, 0, 255) if vehicle_violations.get(track_id, {}).get("status") else (0, 255, 0)
                label = f"ID:{track_id} {class_name} Plate: {license_plate_text} {'NO HELMET' if no_helmet else 'OK'}"
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                if head_x2 > head_x1 and head_y2 > head_y1:
                    cv2.rectangle(frame_annotated, (head_x1, head_y1), (head_x2, head_y2), color, 1)

            frame_buffer.append(frame_for_video.copy())

            for track_id in list(recording_tasks.keys()):
                task = recording_tasks[track_id]
                if task["frames_remaining"] > 0:
                    task["writer"].write(frame_for_video)
                    task["frames_remaining"] -= 1
                else:
                    task["writer"].release()
                    del recording_tasks[track_id]

            for track_id in list(vehicle_violations.keys()):
                if track_id not in active_track_ids and time.time() - vehicle_violations[track_id]["last_seen"] > 60:
                    vehicle_violations.pop(track_id, None)

            ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret and jpeg is not None:
                yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
            else:
                print(f"[-] Failed to encode frame to JPEG")

    except Exception as e:
        print(f"[-] Error in stream_no_helmet_service: {str(e)}")
        traceback.print_exc()
    finally:
        cap.release()
        for task in recording_tasks.values():
            task["writer"].release()
        print(f"[+] Closed stream for camera {camera_id}")

def cleanup_on_exit():
    """
    Dọn dẹp thread pool khi thoát
    """
    print("[+] Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("[+] Violation executor shutdown complete")

# Đăng ký hàm cleanup
atexit.register(cleanup_on_exit)