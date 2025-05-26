import cv2
import numpy as np
import os
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

def analyze_traffic_video(stream_url, camera_id, db=None):
    LANE_POLYGONS = [
    np.array([[0, 632], [235, 484], [430, 370], [561, 299], [656, 245], [656, 236], [676, 246], [654, 275], [631, 325], [611, 380], [579, 494], [526, 719]], dtype=np.int32),  # Lane trái
    np.array([[769, 717], [757, 691], [718, 544], [702, 464], [681, 376], [677, 332], [674, 297], [675, 262], [683, 243], [698, 241], [733, 271], [787, 330], [824, 359], [899, 414], [984, 473], [1126, 576], [1208, 632], [1232, 651], [1261, 669], [1279, 681], [1276, 719]], dtype=np.int32) # Lane phải
]
    print(f"[INFO] Start analyze_traffic_video for camera {camera_id} - {stream_url}")
    if db is None:
        db = SessionLocal()
    os.makedirs(VIOLATIONS_DIR, exist_ok=True)

    # Nếu là link YouTube, cần chuyển sang link stream thực sự
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
    stopped_left = set()
    stopped_right = set()
    vehicle_in_zone = {}  # {track_id: [start_frame, last_frame, lane_idx]}
    violation_saved = set()  # track_id đã lưu ảnh

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                print("[WARN] Cannot read frame, retrying...")
                continue  # Không break, để giữ stream sống

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
                lane_idx = None
                if cv2.pointPolygonTest(LANE_POLYGONS[0], (cx, cy), False) >= 0:
                    lane_idx = 0
                elif cv2.pointPolygonTest(LANE_POLYGONS[1], (cx, cy), False) >= 0:
                    lane_idx = 1
                if lane_idx is not None:
                    if track_id not in vehicle_in_zone:
                        vehicle_in_zone[track_id] = [frame_count, frame_count, lane_idx]
                    else:
                        vehicle_in_zone[track_id][1] = frame_count
                else:
                    if track_id in vehicle_in_zone:
                        del vehicle_in_zone[track_id]
            # Kiểm tra xe nào đã dừng quá 5s
            for track_id, (start, last, lane_idx) in list(vehicle_in_zone.items()):
                if (last - start) / fps >= STOP_SECONDS:
                    if track_id not in violation_saved and track_id in track_dict:
                        # Annotate frame
                        color = (0, 0, 255)
                        x1, y1, x2, y2 = map(int, track_dict[track_id].box)
                        annotated_frame = frame.copy()
                        class_id = track_dict[track_id].class_id if hasattr(track_dict[track_id], "class_id") else 0
                        label = class_names[class_id] if class_names else f"ID:{track_id}"
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(annotated_frame, f"{label}|stopped", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                        cv2.polylines(annotated_frame, [LANE_POLYGONS[lane_idx]], isClosed=True, color=color, thickness=2)
                        cv2.putText(annotated_frame, f"Stopped > {STOP_SECONDS}s", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                        # Lưu ảnh
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"violation_{track_id}_{timestamp}.jpg"
                        filepath = os.path.join(VIOLATIONS_DIR, filename)
                        cv2.imwrite(filepath, annotated_frame)
                        # Ghi DB
                        try:
                            violation = ViolationCreate(
                                camera_id=camera_id,
                                violation_type_id=6,  # 6: xe dừng lâu
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
                    if lane_idx == 0:
                        stopped_left.add(track_id)
                    elif lane_idx == 1:
                        stopped_right.add(track_id)
                    del vehicle_in_zone[track_id]

            # Vẽ polygon làn đường
            for idx, poly in enumerate(LANE_POLYGONS):
                color = (0, 255, 0) if idx == 0 else (255, 0, 0)
                cv2.polylines(frame, [poly], isClosed=True, color=color, thickness=2)

            # Vẽ bounding box và highlight xe dừng lâu
            for track in tracks:
                x1, y1, x2, y2 = map(int, track.box)
                color = (0, 255, 0)
                if track.id in stopped_left or track.id in stopped_right:
                    color = (0, 0, 255)
                class_id = track.class_id if hasattr(track, "class_id") else 0
                label = class_names[class_id] if class_names else f"ID:{track.id}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{label}|ID:{track.id}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            # Encode frame thành JPEG và yield về FE
            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

            frame_count += 1

    finally:
        cap.release()
        db.close()
        print(f"[INFO] Closed stream for camera {camera_id}")