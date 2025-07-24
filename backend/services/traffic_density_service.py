import cv2
import numpy as np
import os
from ultralytics import YOLO
from datetime import datetime
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate

HEAVY_TRAFFIC_THRESHOLD = 10
STOP_SECONDS = 5
VIOLATIONS_DIR = "VIOLATIONS"
MODEL_PATH = "yolov8m.pt"
model = YOLO(MODEL_PATH)

FRAME_WIDTH = 640
FRAME_HEIGHT = 384

LANE_POLYGONS = [
    np.array([
        [266, 384], [237, 338], [379, 319], [457, 384]
    ], np.int32),
    np.array([
        [640, 249], [555, 260], [509, 234], [640, 222]
    ], np.int32),
    np.array([
        [155, 98], [286, 197], [360, 192], [171, 96]
    ], np.int32),
    np.array([
        [0, 246], [109, 235], [118, 255], [0, 268]
    ], np.int32)
]

# Chỉ detect các class này (COCO: car=2, motorcycle=3, bus=5, truck=7)
ALLOWED_CLASSES = [2, 3, 5, 7]

def analyze_traffic_video(stream_url, camera_id, db=None):
    print(f"[INFO] Start analyze_traffic_video for camera {camera_id} - {stream_url}")
    if db is None:
        db = SessionLocal()
    os.makedirs(VIOLATIONS_DIR, exist_ok=True)

    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        try:
            from utils.yt_stream import get_stream_url
            stream_url = get_stream_url(stream_url)
            print(f"[INFO] Converted YouTube URL to stream: {stream_url}")
        except Exception as e:
            print(f"[ERROR] Cannot convert YouTube URL: {e}")
            return

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open stream: {stream_url}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_count = 0
    stopped_in_zone = set()
    vehicle_in_zone = {}
    violation_saved = set()
    vehicle_counted = set()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                print("[WARN] Cannot read frame, retrying...")
                continue

            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

            # Dùng YOLOv8 tracking để lấy ID ổn định
            results = model.track(frame, persist=True, conf=0.25, iou=0.4, tracker="bytetrack.yaml")[0]

            if results.boxes is not None and results.boxes.id is not None:
                for i in range(len(results.boxes)):
                    class_id = int(results.boxes.cls[i]) if results.boxes.cls is not None else 0
                    if class_id not in ALLOWED_CLASSES:
                        continue  # Bỏ qua object không phải xe

                    x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    track_id = int(results.boxes.id[i])

                    # Kiểm tra nếu nằm trong bất kỳ polygon nào
                    in_zone = any(
                        cv2.pointPolygonTest(polygon, (cx, cy), False) >= 0
                        for polygon in LANE_POLYGONS
                    )
                    if in_zone:
                        if track_id not in vehicle_in_zone:
                            vehicle_in_zone[track_id] = [frame_count, frame_count]
                            if track_id not in vehicle_counted:
                                vehicle_counted.add(track_id)
                                print(f"[COUNT] Vehicle entered zone: ID={track_id} | Total: {len(vehicle_counted)}")
                        else:
                            vehicle_in_zone[track_id][1] = frame_count
                    else:
                        if track_id in vehicle_in_zone:
                            del vehicle_in_zone[track_id]

                for track_id, (start, last) in list(vehicle_in_zone.items()):
                    if (last - start) / fps >= STOP_SECONDS:
                        if track_id not in violation_saved:
                            # Tìm lại box của track_id này
                            idx = None
                            for i in range(len(results.boxes)):
                                class_id = int(results.boxes.cls[i]) if results.boxes.cls is not None else 0
                                if int(results.boxes.id[i]) == track_id and class_id in ALLOWED_CLASSES:
                                    idx = i
                                    break
                            if idx is not None:
                                color = (0, 0, 255)
                                x1, y1, x2, y2 = map(int, results.boxes.xyxy[idx])
                                annotated_frame = frame.copy()
                                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                                cv2.putText(annotated_frame, f"ID:{track_id}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                                for polygon in LANE_POLYGONS:
                                    cv2.polylines(annotated_frame, [polygon], isClosed=True, color=(255,0,255), thickness=1)
                                cv2.putText(annotated_frame, f"Stopped > {STOP_SECONDS}s", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                filename = f"violation_{track_id}_{timestamp}.jpg"
                                filepath = os.path.join(VIOLATIONS_DIR, filename)
                                cv2.imwrite(filepath, annotated_frame)
                                try:
                                    violation = ViolationCreate(
                                        camera_id=camera_id,
                                        violation_type_id=6,
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
                                    violation_saved.add(track_id)
                                    print(f"[INFO] Saved violation for track {track_id} at {filepath}")
                                except Exception as e:
                                    print(f"[ERROR] Error saving violation to database: {e}")
                                    db.rollback()
                        stopped_in_zone.add(track_id)
                        del vehicle_in_zone[track_id]

                # Vẽ tất cả các polygon
                for polygon in LANE_POLYGONS:
                    cv2.polylines(frame, [polygon], isClosed=True, color=(255,0,255), thickness=1)

                # Vẽ bounding box và ID
                for i in range(len(results.boxes)):
                    class_id = int(results.boxes.cls[i]) if results.boxes.cls is not None else 0
                    if class_id not in ALLOWED_CLASSES:
                        continue
                    x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                    track_id = int(results.boxes.id[i])
                    color = (0, 255, 0)
                    if track_id in stopped_in_zone:
                        color = (0, 0, 255)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame, f"ID:{track_id}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            ret_jpeg, jpeg = cv2.imencode('.jpg', frame)
            if ret_jpeg:
                img_size = len(jpeg.tobytes())
                print(f"[LOG] Frame {frame_count}: JPEG size = {img_size} bytes")
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
                )
            else:
                print(f"[ERROR] Failed to encode frame {frame_count} to JPEG.")

            frame_count += 1

    finally:
        cap.release()
        db.close()
        print(f"[INFO] Closed stream for camera {camera_id}")