import cv2
import numpy as np
import os
import json
from ultralytics import YOLO
from motpy import Detection, MultiObjectTracker
from datetime import datetime
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate

HEAVY_TRAFFIC_THRESHOLD = 10
STOP_SECONDS = 5
VIOLATIONS_DIR = "VIOLATIONS"
MODEL_PATH = "best.pt"
model = YOLO(MODEL_PATH)

FRAME_WIDTH = 640
FRAME_HEIGHT = 384

def load_roi_polygon(json_path):
    with open(json_path, "r") as f:
        data = json.load(f)
    polygon = np.array([[int(round(x)), int(round(y))] for x, y in data["polygons"][0]], np.int32)
    return polygon

def analyze_traffic_video(stream_url, camera_id, roi_json_path="roi.json", db=None):
    LANE_POLYGON = load_roi_polygon(roi_json_path)

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
    tracker = MultiObjectTracker(dt=1/fps)
    stopped_in_zone = set()
    vehicle_in_zone = {}
    violation_saved = set()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                print("[WARN] Cannot read frame, retrying...")
                continue

            # Resize frame về đúng kích thước annotation/model
            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

            results = model.predict(frame, imgsz=640, conf=0.4)
            boxes = results[0].boxes.xyxy.cpu().numpy()
            class_ids = results[0].boxes.cls.cpu().numpy() if hasattr(results[0].boxes, "cls") else [0]*len(boxes)
            scores = results[0].boxes.conf.cpu().numpy() if hasattr(results[0].boxes, "conf") else [1.0]*len(boxes)
            class_names = getattr(model, "names", None)
            detections = []
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = map(float, box)
                class_id = int(class_ids[i])
                score = float(scores[i])
                detections.append(Detection(box=[x1, y1, x2, y2], score=score, class_id=class_id))
            tracker.step(detections)
            tracks = tracker.active_tracks(min_steps_alive=1)
            track_dict = {track.id: track for track in tracks}
            for track in tracks:
                track_id = track.id
                x1, y1, x2, y2 = track.box
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                in_zone = cv2.pointPolygonTest(LANE_POLYGON, (int(cx), int(cy)), False) >= 0
                if in_zone:
                    if track_id not in vehicle_in_zone:
                        vehicle_in_zone[track_id] = [frame_count, frame_count]
                    else:
                        vehicle_in_zone[track_id][1] = frame_count
                else:
                    if track_id in vehicle_in_zone:
                        del vehicle_in_zone[track_id]
            for track_id, (start, last) in list(vehicle_in_zone.items()):
                if (last - start) / fps >= STOP_SECONDS:
                    if track_id not in violation_saved and track_id in track_dict:
                        color = (0, 0, 255)
                        x1, y1, x2, y2 = map(int, track_dict[track_id].box)
                        annotated_frame = frame.copy()
                        class_id = track_dict[track_id].class_id if hasattr(track_dict[track_id], "class_id") else 0
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(annotated_frame, f"{track_id}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                        cv2.polylines(annotated_frame, [LANE_POLYGON], isClosed=True, color=(255,0,255), thickness=1)
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

            # Vẽ vùng polygon với viền mỏng, không vẽ chữ "VUNG KIEM TRA"
            cv2.polylines(frame, [LANE_POLYGON], isClosed=True, color=(255,0,255), thickness=1)

            for track in tracks:
                x1, y1, x2, y2 = map(int, track.box)
                color = (0, 255, 0)
                if track.id in stopped_in_zone:
                    color = (0, 0, 255)
                class_id = track.class_id if hasattr(track, "class_id") else 0
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{track.id}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

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