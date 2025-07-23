import cv2
import numpy as np
import os
from ultralytics import YOLO
from datetime import datetime
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate

MODEL_POTHOLE = "best1.pt"
MODEL_ANIMAL = "yolov8m.pt"  # hoặc model động vật custom của bạn
VIOLATIONS_DIR = "VIOLATIONS"

# COCO animal class_id
ANIMAL_CLASSES = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]  # dog, horse, sheep, cow, elephant, bear, zebra, giraffe, cat, bird

def detect_potholes_in_video(stream_url, camera_id, db=None):
    from utils.yt_stream import get_stream_url
    if db is None:
        db = SessionLocal()
    os.makedirs(VIOLATIONS_DIR, exist_ok=True)

    # Convert YouTube link nếu cần
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

                        # Ghi DB
                        try:
                            violation = ViolationCreate(
                                camera_id=camera_id,
                                violation_type_id=7,  # 7: pothole
                                license_plate="Unknown",
                                vehicle_color="Unknown",
                                vehicle_brand="Unknown",
                                image_url=filepath,
                                violation_time=datetime.now()
                            )
                            db_violation = Violation(
                                camera_id=violation.camera_id,
                                violation_type_id=violation.violation_type_id,
                                license_plate=violation.license_plate,
                                vehicle_color=violation.vehicle_color,
                                vehicle_brand=violation.vehicle_brand,
                                image_url=violation.image_url,
                                violation_time=violation.violation_time
                            )
                            db.add(db_violation)
                            db.commit()
                        except Exception as e:
                            print(f"[ERROR] Error saving pothole violation to database: {e}")
                            db.rollback()

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

                        # Ghi DB
                        try:
                            violation = ViolationCreate(
                                camera_id=camera_id,
                                violation_type_id=8,  # 8: animal
                                license_plate="Unknown",
                                vehicle_color="Unknown",
                                vehicle_brand=class_name,
                                image_url=filepath,
                                violation_time=datetime.now()
                            )
                            db_violation = Violation(
                                camera_id=violation.camera_id,
                                violation_type_id=violation.violation_type_id,
                                license_plate=violation.license_plate,
                                vehicle_color=violation.vehicle_color,
                                vehicle_brand=violation.vehicle_brand,
                                image_url=violation.image_url,
                                violation_time=violation.violation_time
                            )
                            db.add(db_violation)
                            db.commit()
                        except Exception as e:
                            print(f"[ERROR] Error saving animal violation to database: {e}")
                            db.rollback()

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
            frame_idx += 1
    finally:
        cap.release()
        db.close()