import os
import cv2
import numpy as np
import json
import time
from datetime import datetime
from ultralytics import YOLO
from utils.yt_stream import get_stream_url

import aiohttp
import asyncio

MODEL_POTHOLE = "best1.pt"
MODEL_ANIMAL = "yolov8m.pt"  # hoặc model động vật custom của bạn
VIOLATIONS_DIR = "VIOLATIONS"

# COCO animal class_id
ANIMAL_CLASSES = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]  # dog, horse, sheep, cow, elephant, bear, zebra, giraffe, cat, bird

os.makedirs(VIOLATIONS_DIR, exist_ok=True)

async def send_violation_async(violation_data, snapshot_filepath):
    """
    Gửi dữ liệu vi phạm đến API bất đồng bộ (gửi ảnh)
    """
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
            with open(snapshot_filepath, "rb") as img_file:
                form = aiohttp.FormData()
                form.add_field("Violation", json.dumps(violation_data))
                form.add_field("imageFile", img_file, filename=os.path.basename(snapshot_filepath), content_type="image/jpeg")
                async with session.post("http://localhost:8081/api/violations", data=form) as response:
                    if response.status == 200:
                        print(f"[+] Violation saved to API: {await response.json()}")
                    else:
                        print(f"[-] HTTP error when saving violation to API: {response.status}")
    except Exception as e:
        print(f"[-] Error saving violation to API: {str(e)}")

def detect_potholes_in_video(stream_url, camera_id):
    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        try:
            stream_url = get_stream_url(stream_url)
        except Exception as e:
            print(f"[ERROR] Cannot convert YouTube URL: {e}")
            return

    model_pothole = YOLO(MODEL_POTHOLE)
    model_animal = YOLO(MODEL_ANIMAL)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open stream: {stream_url}")
        return

    frame_idx = 0
    pothole_saved = set()
    animal_saved = set()
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            # --- Pothole detection ---
            results_pothole = model_pothole(frame)
            for r in results_pothole:
                boxes = r.boxes
                for box in boxes:
                    class_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    class_name = model_pothole.names[class_id] if hasattr(model_pothole, "names") else "Pothole"
                    if conf < 0.5 or "pothole" not in class_name.lower():
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"Pothole {conf:.2f}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)

                    pothole_key = (frame_idx, x1, y1, x2, y2)
                    if pothole_key not in pothole_saved:
                        annotated_frame = frame.copy()
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"pothole_{frame_idx}_{timestamp}.jpg"
                        filepath = os.path.join(VIOLATIONS_DIR, filename)
                        cv2.imwrite(filepath, annotated_frame)
                        pothole_saved.add(pothole_key)

                        # Gửi API
                        violation_data = {
                            "camera": {"id": camera_id},
                            "vehicle": {"licensePlate": "Unknown"},
                            "vehicleType": {"id": 0},
                            "createdAt": datetime.now().isoformat(),
                            "status": "PENDING",
                            "violationDetails": [
                                {
                                    "violationTypeId": 7,  # 7: pothole
                                    "location": "Unknown",
                                    "violationTime": datetime.now().isoformat(),
                                    "additionalNotes": f"Frame: {frame_idx}"
                                }
                            ]
                        }
                        try:
                            asyncio.run(send_violation_async(violation_data, filepath))
                        except Exception as e:
                            print(f"[-] Error running send_violation_async: {str(e)}")

            # --- Animal detection ---
            results_animal = model_animal(frame)
            for r in results_animal:
                boxes = r.boxes
                for box in boxes:
                    class_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    if class_id not in ANIMAL_CLASSES or conf < 0.2:
                        continue
                    class_name = model_animal.names[class_id] if hasattr(model_animal, "names") else "Animal"
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
                    cv2.putText(frame, f"{class_name} {conf:.2f}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,0,0), 2)

                    animal_key = (frame_idx, class_id, x1, y1, x2, y2)
                    if animal_key not in animal_saved:
                        annotated_frame = frame.copy()
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"animal_{class_name}_{frame_idx}_{timestamp}.jpg"
                        filepath = os.path.join(VIOLATIONS_DIR, filename)
                        cv2.imwrite(filepath, annotated_frame)
                        animal_saved.add(animal_key)

                        # Gửi API
                        violation_data = {
                            "camera": {"id": camera_id},
                            "vehicle": {"licensePlate": "Unknown"},
                            "vehicleType": {"id": 0},
                            "createdAt": datetime.now().isoformat(),
                            "status": "PENDING",
                            "violationDetails": [
                                {
                                    "violationTypeId": 8,  # 8: animal
                                    "location": "Unknown",
                                    "violationTime": datetime.now().isoformat(),
                                    "additionalNotes": f"Frame: {frame_idx}, Class: {class_name}"
                                }
                            ]
                        }
                        try:
                            asyncio.run(send_violation_async(violation_data, filepath))
                        except Exception as e:
                            print(f"[-] Error running send_violation_async: {str(e)}")

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
            frame_idx += 1
    finally:
        cap.release()