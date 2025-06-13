import tempfile
import cv2
import os
from fastapi import UploadFile
from ultralytics import YOLO

# Đường dẫn tới model đã huấn luyện
MODEL_PATH = "best1.pt"

def detect_potholes_in_video(stream_url, camera_id, db=None):
    from utils.yt_stream import get_stream_url
    import cv2, os
    from ultralytics import YOLO
    from datetime import datetime
    from models.model import Violation
    from schemas.violation_schema import ViolationCreate
    from database import SessionLocal

    MODEL_PATH = "best1.pt"
    VIOLATIONS_DIR = "VIOLATIONS"
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

    model = YOLO(MODEL_PATH)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open stream: {stream_url}")
        return

    frame_idx = 0
    pothole_saved = set()
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            results = model(frame)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    class_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    class_name = model.names[class_id] if hasattr(model, "names") else "Pothole"
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

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
            frame_idx += 1
    finally:
        cap.release()
        db.close()