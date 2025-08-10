import os
import cv2
import math
import time
import requests
import json
import numpy as np
from datetime import datetime
from collections import deque
from ultralytics import YOLO
from shapely.geometry import Point, Polygon
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate
from utils.yt_stream import get_stream_url
from crud import violation_crud  
import traceback
import tempfile
import ffmpeg
import threading
from concurrent.futures import ThreadPoolExecutor
import atexit

MODEL_POTHOLE = "best1.pt"
MODEL_ANIMAL = "yolov8m.pt"  # hoặc model động vật custom của bạn
VIOLATIONS_DIR = "VIOLATIONS"
VIOLATION_API_URL = "http://localhost:8081/api/violations"
violation_executor = ThreadPoolExecutor(max_workers=5)
# COCO animal class_id
ANIMAL_CLASSES = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]  # dog, horse, sheep, cow, elephant, bear, zebra, giraffe, cat, bird

os.makedirs(VIOLATIONS_DIR, exist_ok=True)

def send_violation_async(violation_data, image_path, video_path, track_id):
    """Send violation to API asynchronously"""
    def send_violation():
        try:
            with open(image_path, 'rb') as img_file, open(video_path, 'rb') as vid_file:
                files = {
                    'imageFile': ('violation.jpg', img_file, 'image/jpeg'),
                    'videoFile': ('violation.mp4', vid_file, 'video/mp4'),
                    'Violation': (None, json.dumps(violation_data), 'application/json')
                }
                response = requests.post(VIOLATION_API_URL, files=files, timeout=10)
                response.raise_for_status()
                print(f"✅ Violation sent successfully for track {track_id}: {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to send violation to API for track {track_id}: {e}")
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(image_path):
                    os.remove(image_path)
                if os.path.exists(video_path):
                    os.remove(video_path)
                print(f"🗑️ Cleaned up temp files for track {track_id}")
            except Exception as e:
                print(f"⚠️ Error deleting temp files for track {track_id}: {e}")
    
    # Submit to thread pool for async execution
    violation_executor.submit(send_violation)

def detect_potholes_in_video(stream_url, camera_id):
    """
    Improved pothole and animal detection with proper API handling and file management
    """
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
    
    # Tracking để tránh spam detection
    pothole_cooldown = {}  # track_id -> last_detection_frame
    animal_cooldown = {}   # track_id -> last_detection_frame
    COOLDOWN_FRAMES = 150  # 5 seconds at 30fps
    
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                print("Failed to read frame, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_annotated = frame.copy()
            h, w, _ = frame.shape

            # --- Pothole detection ---
            try:
                results_pothole = model_pothole(frame)
                for r in results_pothole:
                    if r.boxes is None:
                        continue
                        
                    boxes = r.boxes
                    for box in boxes:
                        class_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        class_name = model_pothole.names[class_id] if hasattr(model_pothole, "names") else "Pothole"
                        
                        if conf < 0.5 or "pothole" not in class_name.lower():
                            continue

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        # Draw detection
                        cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(frame_annotated, f"Pothole {conf:.2f}", (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)

                        # Create unique key for this detection
                        detection_center = ((x1 + x2) // 2, (y1 + y2) // 2)
                        pothole_key = f"{detection_center[0]}_{detection_center[1]}"
                        
                        # Check cooldown to avoid duplicate detections
                        if (pothole_key in pothole_cooldown and 
                            frame_idx - pothole_cooldown[pothole_key] < COOLDOWN_FRAMES):
                            continue
                            
                        pothole_cooldown[pothole_key] = frame_idx

                        if pothole_key not in pothole_saved:
                            pothole_saved.add(pothole_key)
                            
                            print(f"🕳️ POTHOLE DETECTED: Frame {frame_idx}, Position ({detection_center[0]}, {detection_center[1]}), Confidence: {conf:.2f}")

                            # Create temporary file for violation image
                            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image:
                                image_path = temp_image.name
                                
                                # Save annotated image
                                cv2.imwrite(image_path, frame_annotated)

                                # Prepare violation data for API
                                violation_data = {
                                    "camera": {"id": camera_id},
                                    "status": "PENDING",
                                    "createdAt": datetime.now().isoformat(),
                                    "violationDetails": [{
                                        "violationTypeId": 7,  # POTHOLE
                                        "violationTime": datetime.now().isoformat(),
                                        "licensePlate": f"POTHOLE_{frame_idx}_{detection_center[0]}_{detection_center[1]}",
                                        "additionalNotes": f"Frame: {frame_idx}, Confidence: {conf:.2f}, Position: {detection_center}"
                                    }]
                                }

                                # Send violation asynchronously (non-blocking)
                                print(f"📤 Sending POTHOLE violation for frame {frame_idx} asynchronously...")
                                send_violation_async(violation_data, image_path, None, f"pothole_{frame_idx}")

            except Exception as e:
                print(f"[ERROR] Pothole detection failed: {e}")

            # --- Animal detection ---
            try:
                results_animal = model_animal(frame)
                for r in results_animal:
                    if r.boxes is None:
                        continue
                        
                    boxes = r.boxes
                    for box in boxes:
                        class_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        
                        if class_id not in ANIMAL_CLASSES or conf < 0.3:
                            continue
                            
                        class_name = model_animal.names[class_id] if hasattr(model_animal, "names") else "Animal"
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        # Draw detection
                        cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), (255, 0, 0), 2)
                        cv2.putText(frame_annotated, f"{class_name} {conf:.2f}", (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,0,0), 2)

                        # Create unique key for this detection
                        detection_center = ((x1 + x2) // 2, (y1 + y2) // 2)
                        animal_key = f"{class_name}_{detection_center[0]}_{detection_center[1]}"
                        
                        # Check cooldown to avoid duplicate detections
                        if (animal_key in animal_cooldown and 
                            frame_idx - animal_cooldown[animal_key] < COOLDOWN_FRAMES):
                            continue
                            
                        animal_cooldown[animal_key] = frame_idx

                        if animal_key not in animal_saved:
                            animal_saved.add(animal_key)
                            
                            print(f"🐕 ANIMAL DETECTED: {class_name}, Frame {frame_idx}, Position ({detection_center[0]}, {detection_center[1]}), Confidence: {conf:.2f}")

                            # Create temporary file for violation image
                            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image:
                                image_path = temp_image.name
                                
                                # Save annotated image
                                cv2.imwrite(image_path, frame_annotated)

                                # Prepare violation data for API
                                violation_data = {
                                    "camera": {"id": camera_id},
                                    "status": "PENDING", 
                                    "createdAt": datetime.now().isoformat(),
                                    "violationDetails": [{
                                        "violationTypeId": 8,  # ANIMAL
                                        "violationTime": datetime.now().isoformat(),
                                        "licensePlate": f"ANIMAL_{class_name}_{frame_idx}_{detection_center[0]}_{detection_center[1]}",
                                        "additionalNotes": f"Frame: {frame_idx}, Animal: {class_name}, Confidence: {conf:.2f}, Position: {detection_center}"
                                    }]
                                }

                                # Send violation asynchronously (non-blocking)
                                print(f"📤 Sending ANIMAL violation ({class_name}) for frame {frame_idx} asynchronously...")
                                send_violation_async(violation_data, image_path, None, f"animal_{class_name}_{frame_idx}")

            except Exception as e:
                print(f"[ERROR] Animal detection failed: {e}")

            # Stream the annotated frame
            try:
                _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
                )
            except Exception as e:
                print(f"[ERROR] Frame encoding failed: {e}")
                
            frame_idx += 1
            
    except Exception as e:
        print(f"❌ Error in detect_potholes_in_video: {e}")
        traceback.print_exc()
    finally:
        # Clean up resources
        cap.release()
        print("🧹 Pothole detection stream cleanup completed")


# Helper function to handle async violation sending (if not already defined)
def send_violation_async(violation_data, image_path, video_path=None, track_id=None):
    """
    Send violation data to API asynchronously
    """
    try:
        # Prepare files for upload
        files = {}
        if image_path and os.path.exists(image_path):
            files['image'] = ('violation.jpg', open(image_path, 'rb'), 'image/jpeg')
        
        if video_path and os.path.exists(video_path):
            files['video'] = ('violation.mp4', open(video_path, 'rb'), 'video/mp4')

        # Send to API
        api_url = "http://localhost:8081/api/violations"
        
        # Convert violation_data to form data
        data = {
            'violationData': json.dumps(violation_data)
        }
        
        response = requests.post(api_url, data=data, files=files, timeout=10)
        
        # Close file handles
        for file_obj in files.values():
            if hasattr(file_obj[1], 'close'):
                file_obj[1].close()
        
        if response.status_code == 200 or response.status_code == 201:
            print(f"✅ Violation sent successfully for {track_id or 'detection'}")
        else:
            print(f"❌ Failed to send violation: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error sending violation async: {e}")
    finally:
        # Clean up temporary files
        try:
            if image_path and os.path.exists(image_path):
                os.unlink(image_path)
            if video_path and os.path.exists(video_path):
                os.unlink(video_path)
        except Exception as e:
            print(f"Warning: Could not clean up temp files: {e}")