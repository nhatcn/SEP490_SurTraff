# camera_service.py
from crud import violation_crud
import cv2
import math
from datetime import datetime
from ultralytics import YOLO
from utils.yt_stream import get_stream_url
from collections import defaultdict
import os
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate
import traceback

model_vehicle = YOLO("yolov8m.pt")
model_light = YOLO("final.pt")  # Đèn đỏ

stop_line_y = 550
iou_threshold = 200
red_light_buffer_size = 3

# Create violations directory if it doesn't exist
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)

def stream_normal_video_service(youtube_url: str):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            results = model_vehicle(frame)
            annotated = results[0].plot()

            _, jpeg = cv2.imencode('.jpg', annotated)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
    finally:
        cap.release()

def stream_violation_video_service(youtube_url: str, camera_id: int):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    red_light_history = []
    vehicle_states = {}  # track_id: {prev_y, violated, photo_saved}
    db = SessionLocal()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            h, w, _ = frame.shape
            stop_line_y = h * 4 // 10  # Line nằm 40% chiều cao

            # Detect đèn đỏ
            light_results = model_light(frame)[0]
            red_detected = False
            for box in light_results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if model_light.names[cls_id].lower() == 'red' and conf > 0.5:
                    red_detected = True
                    break

            red_light_history.append(red_detected)
            if len(red_light_history) > red_light_buffer_size:
                red_light_history.pop(0)

            is_red = red_light_history.count(True) > red_light_buffer_size // 2

            # Detect và track vehicle
            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
                continue

            boxes = results.boxes

            # Tạo bản sao frame để annotate ảnh chụp khi cần
            annotated_frame_for_capture = frame.copy()

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i])
                class_name = model_vehicle.names[cls_id]
                conf = float(boxes.conf[i])
                track_id = int(boxes.id[i])

                if class_name not in ['car', 'truck', 'bus', 'motorbike', 'bicycle'] or conf < 0.3:
                    continue

                x1, y1, x2, y2 = map(int, boxes.xyxy[i])
                center_y = (y1 + y2) // 2

                if track_id not in vehicle_states:
                    vehicle_states[track_id] = {'prev_y': center_y, 'violated': False, 'photo_saved': False}
                else:
                    prev_y = vehicle_states[track_id]['prev_y']
                    violated = vehicle_states[track_id]['violated']
                    photo_saved = vehicle_states[track_id]['photo_saved']

                    if is_red and not violated:
                        if prev_y > stop_line_y >= center_y:
                            vehicle_states[track_id]['violated'] = True

                            if not photo_saved:
                                # Annotate lại để lưu ảnh chụp
                                color = (0, 0, 255)
                                cv2.rectangle(annotated_frame_for_capture, (x1, y1), (x2, y2), color, 1)
                                cv2.putText(annotated_frame_for_capture, f"ID:{track_id}|violation", (x1, y1 - 10),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 1)
                                cv2.line(annotated_frame_for_capture, (0, stop_line_y), (w, stop_line_y), color, 1)
                                cv2.putText(annotated_frame_for_capture, f"Red Light: YES", (10, 30),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1)

                                # Lưu ảnh
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                filename = f"violation_{track_id}_{timestamp}.jpg"
                                filepath = os.path.join(VIOLATIONS_DIR, filename)
                                cv2.imwrite(filepath, annotated_frame_for_capture)

                                # Ghi DB
                                violation = ViolationCreate(
                                    camera_id=camera_id,
                                    violation_type_id=1,
                                    license_plate="Unknown",
                                    vehicle_color="Unknown",
                                    vehicle_brand="Unknown",
                                    image_url=filepath,
                                    violation_time=datetime.now()
                                )
                                try:
                                    db_violation = Violation(**violation.model_dump())
                                    db.add(db_violation)
                                    db.commit()
                                    vehicle_states[track_id]['photo_saved'] = True
                                except Exception as e:
                                    print(f"Error saving violation to database: {e}")
                                    db.rollback()

                    vehicle_states[track_id]['prev_y'] = center_y

                violated = vehicle_states[track_id]['violated']
                color = (0, 0, 255) if violated else (0, 255, 0)
                status = 'violation' if violated else 'normal'

                # Annotate lên frame đang stream
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
                cv2.putText(frame, f"ID:{track_id}|{status}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 1)

            line_color = (0, 0, 255) if is_red else (0, 255, 0)
            cv2.line(frame, (0, stop_line_y), (w, stop_line_y), line_color, 1)
            cv2.putText(frame, f"Red Light: {'YES' if is_red else 'NO'}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, line_color, 2)

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()
        db.close()

def stream_count_video_service(youtube_url: str):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    model = YOLO("yolov8m.pt")
    vehicle_ids = {}
    in_count = {}
    out_count = {}

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            h, w, _ = frame.shape
            line_y = int(h * 0.8)

            results = model.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]

            if results.boxes is None or results.boxes.id is None:
                continue

            boxes = results.boxes
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i])
                class_name = model.names[cls_id]
                conf = float(boxes.conf[i])
                track_id = int(boxes.id[i])

                if class_name not in ['car', 'truck', 'bus', 'motorbike', 'bicycle'] or conf < 0.3:
                    continue

                x1, y1, x2, y2 = map(int, boxes.xyxy[i])
                center_y = (y1 + y2) // 2

                if track_id not in vehicle_ids:
                    vehicle_ids[track_id] = {'prev_y': center_y, 'counted': False, 'class_name': class_name}
                else:
                    prev_y = vehicle_ids[track_id]['prev_y']

                    if not vehicle_ids[track_id]['counted']:
                        if prev_y < line_y <= center_y:
                            in_count[class_name] = in_count.get(class_name, 0) + 1
                            vehicle_ids[track_id]['counted'] = True
                        elif prev_y > line_y >= center_y:
                            out_count[class_name] = out_count.get(class_name, 0) + 1
                            vehicle_ids[track_id]['counted'] = True

                    vehicle_ids[track_id]['prev_y'] = center_y

                # Draw box and ID
                color = (255, 255, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
                cv2.putText(frame, f"ID:{track_id}, {class_name}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)

            # Draw count line
            cv2.line(frame, (0, line_y), (w, line_y), (0, 255, 255), 1)

            # Display per-class IN and OUT counts
            y_offset = 40
            for class_name in sorted(set(in_count.keys()) | set(out_count.keys())):
                in_c = in_count.get(class_name, 0)
                out_c = out_count.get(class_name, 0)
                cv2.putText(frame, f"{class_name.upper()} IN: {in_c}", (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
                y_offset += 30
                cv2.putText(frame, f"{class_name.upper()} OUT: {out_c}", (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1)
                y_offset += 30

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
    finally:
        cap.release()

def stream_accident_video_service(youtube_url: str):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    model_accident = YOLO("accident.pt")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            results = model_accident(frame)[0]
            annotated_frame = frame.copy()

            for box in results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = model_accident.names[cls_id]

                if conf < 0.5:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 0, 255) if "accident" in class_name.lower() else (0, 255, 0)
                label = f"{class_name} {conf:.2f}"

                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            _, jpeg = cv2.imencode('.jpg', annotated_frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
    finally:
        cap.release()

def stream_plate_with_ocr_video_service(youtube_url: str):
    from ultralytics import YOLO
    import cv2

    model_plate = YOLO("best90.pt")  # Model phát hiện biển số
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            results = model_plate(frame)[0]

            for box in results.boxes:
                cls_id = int(box.cls[0])
                class_name = model_plate.names[cls_id]
                conf = float(box.conf[0])

                # Tọa độ bounding box
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Vẽ box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                # Ghi nhãn class
                label = f"{class_name}"  # hoặc thêm f"{class_name} {conf:.2f}"
                cv2.putText(frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            # Encode và yield MJPEG stream
            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()