import os
import cv2
import math
import time
from datetime import datetime
from collections import deque

from ultralytics import YOLO
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate
from utils.yt_stream import get_stream_url
from crud import violation_crud  
import traceback
import numpy as np


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
    vehicle_states = {}  # track_id: {prev_y, violated, video_saved}
    frame_buffer = deque(maxlen=30)  # 1 giây (30fps)
    recording_tasks = {}  # track_id: {writer, frames_remaining, file_path}
    db = SessionLocal()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            h, w, _ = frame.shape
            stop_line_y = h * 4 // 10

            # 1 bản để annotate đầy đủ hiển thị stream
            frame_annotated = frame.copy()

            # 1 bản riêng chỉ vẽ line và xe vi phạm (để ghi video)
            frame_for_video = frame.copy()

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

            # Vẽ vạch dừng và trạng thái đèn lên cả 2 bản
            line_color = (0, 0, 255) if is_red else (0, 255, 0)
            for f in [frame_annotated, frame_for_video]:
                cv2.line(f, (0, stop_line_y), (w, stop_line_y), line_color, 1)
                cv2.putText(f, f"Red Light: {'YES' if is_red else 'NO'}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, line_color, 2)

            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
                frame_buffer.append(frame_for_video.copy())
                continue

            boxes = results.boxes
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
                    vehicle_states[track_id] = {'prev_y': center_y, 'violated': False, 'video_saved': False}
                else:
                    prev_y = vehicle_states[track_id]['prev_y']
                    violated = vehicle_states[track_id]['violated']
                    video_saved = vehicle_states[track_id]['video_saved']

                    if is_red and not violated:
                        if prev_y > stop_line_y >= center_y:
                            vehicle_states[track_id]['violated'] = True

                            if not video_saved:
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                filename = f"violation_{track_id}_{timestamp}.mp4"
                                filepath = os.path.join(VIOLATIONS_DIR, filename)

                                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                                fps = 30
                                writer = cv2.VideoWriter(filepath, fourcc, fps, (w, h))

                                for buf_frame in frame_buffer:
                                    writer.write(buf_frame)

                                recording_tasks[track_id] = {
                                    'writer': writer,
                                    'frames_remaining': 30,
                                    'file_path': filepath
                                }

                                vehicle_states[track_id]['video_saved'] = True

                    vehicle_states[track_id]['prev_y'] = center_y

                violated = vehicle_states[track_id]['violated']

                if violated:
                    # Vẽ box chỉ cho xe vi phạm vào cả stream và video
                    color = (0, 0, 255)
                    label = f"ID:{track_id}|violation"
                    for f in [frame_annotated, frame_for_video]:
                        cv2.rectangle(f, (x1, y1), (x2, y2), color, 1)
                        cv2.putText(f, label, (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 1)
                else:
                    # Vẽ lên frame stream thôi (không buffer)
                    cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), (0, 255, 0), 1)
                    cv2.putText(frame_annotated, f"ID:{track_id}|normal", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 1)

            # Buffer bản ghi video (chỉ line + xe vi phạm)
            frame_buffer.append(frame_for_video.copy())

            # Xử lý các video đang ghi
            for track_id in list(recording_tasks.keys()):
                task = recording_tasks[track_id]
                if task['frames_remaining'] > 0:
                    task['writer'].write(frame_for_video)
                    task['frames_remaining'] -= 1
                else:
                    task['writer'].release()
                    filepath = task['file_path']

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
                    except Exception as e:
                        print(f"Error saving violation to database: {e}")
                        db.rollback()

                    del recording_tasks[track_id]

            _, jpeg = cv2.imencode('.jpg', frame_annotated)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()
        db.close()
        for task in recording_tasks.values():
            task['writer'].release()


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
        
def stream_violation_wrongway_video_service(youtube_url: str):
    model_plate = YOLO("yolov8m.pt")
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    TARGET_CLASSES = {'car', 'truck', 'motorcycle'}

    # Kích thước video gốc (bạn cần thay chính xác theo video gốc của bạn)
    orig_w, orig_h = 3840, 2160  # Ví dụ video gốc 4K, thay bằng đúng kích thước video gốc của bạn

    # Vùng polygon stop line theo video gốc
    stop_line_zone1 = [(1405, 780), (1540, 765), (960, 2115), (190, 2110)]    
    stop_line_zone2 = [(1680, 740), (1545, 750), (955, 2130), (1750, 2065)]   
    stop_line_zone3 = [(1805, 675), (1925, 700), (3515, 2075), (2800, 2080)] 
    stop_line_zone4 = [(1940, 720), (2075, 735), (3800, 1785), (3615, 2145)]

    def scale_polygon(polygon, scale_x, scale_y):
        return [(int(x * scale_x), int(y * scale_y)) for x, y in polygon]

    def get_zones_for_class(cls, zones):
        return {
            'car': [zones[1], zones[3]],
            'truck': [zones[0], zones[2]],
            'motorcycle': [zones[2]]
        }.get(cls, [])

    def box_in_polygon(box, polygon, frame_shape, threshold=500):
        mask_poly = np.zeros((frame_shape[0], frame_shape[1]), dtype=np.uint8)
        cv2.fillPoly(mask_poly, [np.array(polygon, dtype=np.int32)], 255)

        x1, y1, x2, y2 = map(int, box)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(frame_shape[1], x2), min(frame_shape[0], y2)

        mask_box = np.zeros_like(mask_poly)
        cv2.rectangle(mask_box, (x1, y1), (x2, y2), 255, -1)

        intersection = cv2.bitwise_and(mask_poly, mask_box)
        inter_area = np.count_nonzero(intersection)

        return inter_area > threshold

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(stream_url)
                continue

            stream_h, stream_w = frame.shape[:2]

            scale_x = stream_w / orig_w
            scale_y = stream_h / orig_h

            zones_scaled = [
                scale_polygon(stop_line_zone1, scale_x, scale_y),
                scale_polygon(stop_line_zone2, scale_x, scale_y),
                scale_polygon(stop_line_zone3, scale_x, scale_y),
                scale_polygon(stop_line_zone4, scale_x, scale_y),
            ]

            colors = [(0,0,255), (0,255,0), (0,0,255), (0,255,0)]
            for i, zone in enumerate(zones_scaled):
                cv2.polylines(frame, [np.array(zone, np.int32)], isClosed=True, color=colors[i], thickness=3)
                # cx = int(np.mean([p[0] for p in zone]))
                # cy = int(np.mean([p[1] for p in zone]))
                # cv2.putText(frame, f"zone{i+1}", (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 1, colors[i], 2)

            results = model_plate(frame)[0]

            for box in results.boxes:
                cls_id = int(box.cls[0])
                class_name = model_plate.names[cls_id]

                if class_name not in TARGET_CLASSES:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                zones_for_cls = get_zones_for_class(class_name, zones_scaled)
                in_any_zone = any(box_in_polygon((x1, y1, x2, y2), zone, frame.shape) for zone in zones_for_cls)

                label = 'normal' if in_any_zone else 'wrongway'
                color = (0, 255, 0) if label == 'normal' else (0, 0, 255)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{class_name} - {label}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                if label == 'wrongway':
                    pass  # Không lưu ảnh, không ghi log

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()