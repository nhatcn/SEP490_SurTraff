# camera_service.py

import cv2, math
from datetime import datetime
from ultralytics import YOLO
from utils.yt_stream import get_stream_url
from collections import defaultdict

model_vehicle = YOLO("yolov8m.pt")
model_light = YOLO("final.pt")  # Đèn đỏ

stop_line_y = 550
iou_threshold = 200
red_light_buffer_size = 3

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


def stream_violation_video_service(youtube_url: str):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    red_light_history = []
    vehicle_states = {}  # track_id: {prev_y, violated}

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            h, w, _ = frame.shape
            stop_line_y = h * 4 // 10  # 4 phần trên và 6 phần dưới

            # Detect traffic light
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

            # Detect and track vehicles
            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
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
                    vehicle_states[track_id] = {'prev_y': center_y, 'violated': False}
                else:
                    prev_y = vehicle_states[track_id]['prev_y']
                    violated = vehicle_states[track_id]['violated']

                    if is_red and not violated:
                        # Nếu xe đi từ trên xuống và vượt qua line
                        if prev_y > stop_line_y >= center_y:
                            vehicle_states[track_id]['violated'] = True

                    vehicle_states[track_id]['prev_y'] = center_y

                violated = vehicle_states[track_id]['violated']
                # Đổi màu sắc khi vi phạm
                color = (0, 0, 255) if violated else (0, 255, 0)  # Red nếu vi phạm, Green nếu không

                # Cập nhật thông tin ID và trạng thái (violation hay normal)
                status = 'violation' if violated else 'normal'
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
                cv2.putText(frame, f"ID:{track_id}|{status}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 1)

            # Vẽ stop line
            line_color = (0, 0, 255) if is_red else (0, 255, 0)
            cv2.line(frame, (0, stop_line_y), (w, stop_line_y), line_color, 1)
            cv2.putText(frame, f"Red Light: {'YES' if is_red else 'NO'}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, line_color, 1)

            # Encode to JPEG and yield
            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
    finally:
        cap.release()


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
