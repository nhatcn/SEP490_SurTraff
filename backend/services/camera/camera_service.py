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


import cv2
import numpy as np
from datetime import datetime
from collections import deque
from ultralytics import YOLO
from utils.yt_stream import get_stream_url
import traceback

def stream_count_video_service(youtube_url: str, camera_id: int):
    # Load model
    model_vehicle = YOLO("bestv8m.pt")
    vehicle_classes = ['Bus', 'Car', 'Cycle', 'Truck', 'Van']  # Classes 0, 1, 2, 3, 4

    # Constants
    frame_buffer = deque(maxlen=30)  # Buffer for 1 second of frames at 30 FPS
    vehicle_counts = {cls: 0 for cls in vehicle_classes}  # Count for each vehicle type
    track_position_history = {}  # Store previous positions of tracked vehicles
    counted_vehicles = set()  # Track IDs of vehicles already counted

    def point_below_line(point, line_start, line_end):
        x, y = point
        x1, y1 = line_start
        x2, y2 = line_end
        cross_product = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
        return cross_product > 0

    def detect_line_crossing(prev_point, curr_point, line_start, line_end):
        if prev_point is None or curr_point is None:
            return False
        was_below = point_below_line(prev_point, line_start, line_end)
        is_above = not point_below_line(curr_point, line_start, line_end)
        return was_below and is_above

    def draw_rounded_rectangle(frame, top_left, bottom_right, color, radius=10):
        x1, y1 = top_left
        x2, y2 = bottom_right
        # Draw four straight lines
        cv2.line(frame, (x1 + radius, y1), (x2 - radius, y1), color, -1)
        cv2.line(frame, (x1 + radius, y2), (x2 - radius, y2), color, -1)
        cv2.line(frame, (x1, y1 + radius), (x1, y2 - radius), color, -1)
        cv2.line(frame, (x2, y1 + radius), (x2, y2 - radius), color, -1)
        # Draw four quarter-circle arcs for corners
        cv2.ellipse(frame, (x1 + radius, y1 + radius), (radius, radius), 180, 0, 90, color, -1)
        cv2.ellipse(frame, (x2 - radius, y1 + radius), (radius, radius), 270, 0, 90, color, -1)
        cv2.ellipse(frame, (x1 + radius, y2 - radius), (radius, radius), 90, 0, 90, color, -1)
        cv2.ellipse(frame, (x2 - radius, y2 - radius), (radius, radius), 0, 0, 90, color, -1)

    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    # Initialize video output
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    out = None
    frame_size_initialized = False
    line_coords = None

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_annotated = frame.copy()
            h, w, _ = frame.shape
            frame_buffer.append(frame_annotated.copy())

            # Initialize line position (2:8 ratio, bottom to top)
            if not frame_size_initialized:
                line_y = int(h * 0.8)  # 80% from top (2:8 ratio)
                line_coords = np.array([[0, line_y], [w, line_y]], dtype=np.int32)
                print(f"Line initialized at y={line_y} (frame size: {w}x{h})")
                frame_size_initialized = True

                # Initialize video output
                output_video_path = f"output_count_{camera_id}.mp4"
                out = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

            # Draw counting line
            cv2.polylines(frame_annotated, [line_coords], isClosed=False, color=(0, 255, 255), thickness=3)
            mid_point = line_coords[len(line_coords)//2]
            cv2.putText(frame_annotated, "Counting Line", tuple(mid_point), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

            # Detect and track vehicles
            results = model_vehicle.track(source=frame, persist=True, conf=0.4, iou=0.4, tracker="bytetrack.yaml")[0]

            if results.boxes is not None and results.boxes.id is not None:
                for i in range(len(results.boxes)):
                    cls_id = int(results.boxes.cls[i])
                    class_name = model_vehicle.names[cls_id]
                    if class_name not in vehicle_classes:
                        continue

                    x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    track_id = int(results.boxes.id[i])

                    # Save previous position
                    prev_position = track_position_history.get(track_id)
                    track_position_history[track_id] = (cx, cy)

                    # Check if vehicle crosses the line
                    if prev_position and track_id not in counted_vehicles:
                        line_start = tuple(line_coords[0])
                        line_end = tuple(line_coords[1])
                        if detect_line_crossing(prev_position, (cx, cy), line_start, line_end):
                            vehicle_counts[class_name] += 1
                            counted_vehicles.add(track_id)
                            print(f"Vehicle {track_id} ({class_name}) crossed line, count updated: {vehicle_counts[class_name]}")

                    # Draw bounding box and label (text matches box color, no background)
                    color = (0, 255, 0)  # Green for all vehicles
                    label = f"ID:{track_id} {class_name}"
                    cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame_annotated, label, (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # Display vehicle counts (horizontally, with rounded background)
            x_offset = 10
            y_position = 30
            for cls, count in vehicle_counts.items():
                count_text = f"{cls}: {count}"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.6
                font_thickness = 2
                (text_width, text_height), _ = cv2.getTextSize(count_text, font, font_scale, font_thickness)
                # Draw rounded rectangle as background
                top_left = (x_offset, y_position - text_height - 5)
                bottom_right = (x_offset + text_width + 10, y_position + 5)
                draw_rounded_rectangle(frame_annotated, top_left, bottom_right, (0, 0, 0), radius=10)
                # Draw text
                cv2.putText(frame_annotated, count_text, (x_offset + 5, y_position - 3), 
                            font, font_scale, (255, 255, 255), font_thickness)
                x_offset += text_width + 20  # Space between counts

            # Save frame to video output
            if out:
                out.write(frame_annotated)

            # Stream video
            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    except Exception as e:
        print(f"❌ Error in stream_count_video_service: {e}")
        traceback.print_exc()
    finally:
        cap.release()
        if out:
            out.release()
        print("🧹 Stream cleanup completed")
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
        
def put_text_with_background(img, text, org, font_scale=1, thickness=1, text_color=(255, 255, 255), bg_color=(0, 0, 0)):
    import cv2
    font = cv2.FONT_HERSHEY_SIMPLEX
    (w, h), _ = cv2.getTextSize(text, font, font_scale, thickness)
    x, y = org
    # Vẽ hình chữ nhật làm nền
    cv2.rectangle(img, (x, y - h - 5), (x + w, y + 5), bg_color, -1)
    # Vẽ text lên trên
    cv2.putText(img, text, (x, y), font, font_scale, text_color, thickness, cv2.LINE_AA)

def stream_violation_wrongway_video_service(youtube_url: str, camera_id: int, db=None):
    from ultralytics import YOLO
    import cv2
    import numpy as np
    import time
    import uuid
    from collections import defaultdict

    # --- Load Models ---
    model_sign_path = "trafficsign.pt"
    model_vehicle_path = "yolov8m.pt"

    try:
        model_sign = YOLO(model_sign_path)
        model_vehicle = YOLO(model_vehicle_path)
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return

    # --- Get stream URL from your function (you keep your original) ---
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError(f"❌ Cannot open stream from {stream_url}")

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    width, height = 640, 640
    scale_x, scale_y = width / original_width, height / original_height

    original_zones_data = [
        ([(744, 404), (212, 1016), (540, 1044), (832, 428)], (0, 255, 0)),
        ([(828, 424), (560, 1016), (932, 1028), (936, 428)], (0, 0, 255)),
        ([(956, 440), (1016, 1024), (1372, 1004), (1060, 444)], (0, 0, 255)),
        ([(1064, 448), (1376, 1024), (1688, 984), (1164, 444)], (0, 255, 0)),
    ]
    zone_allowed_vehicles = {
        0: ['motorcycle'], 1: ['car', 'truck'], 2: ['car', 'truck'], 3: ['motorcycle']
    }

    scaled_zones = []
    for zone_points, color in original_zones_data:
        scaled_zones.append((
            [(int(x * scale_x), int(y * scale_y)) for x, y in zone_points], color
        ))

    LINE_Y = int(height * 0.5)
    DIRECTION_THRESHOLD = 5
    object_tracks = defaultdict(list)
    OBJECT_SIZE, MARGIN, TEXT_HEIGHT = 64, 10, 25
    target_vehicle_classes = ['car', 'motorcycle', 'truck']

    print(f"🔴 Starting camera {camera_id}, resolution: {original_width}x{original_height}")

    # Mình sẽ dùng 1 biến global id_counter để tạo ID tạm tracking
    id_counter = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Reconnecting...")
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    break
                continue

            resized_frame = cv2.resize(frame, (width, height))
            annotated_frame = resized_frame.copy()

            alpha = 0.4
            for zone_points, color in scaled_zones:
                overlay = annotated_frame.copy()
                pts = np.array(zone_points, np.int32).reshape((-1, 1, 2))
                cv2.fillPoly(overlay, [pts], color)
                cv2.addWeighted(overlay, alpha, annotated_frame, 1 - alpha, 0, annotated_frame)
                cv2.polylines(annotated_frame, [pts], True, color, 2)

            results_sign = model_sign(resized_frame, conf=0.1)
            boxes_sign = results_sign[0].boxes
            display_y = MARGIN

            for box in boxes_sign:
                cls_id = int(box.cls)
                label = model_sign.names[cls_id]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                x1, y1, x2, y2 = max(0, x1), max(0, y1), min(width, x2), min(height, y2)
                if x2 <= x1 or y2 <= y1:
                    continue

                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 165, 255), 2)
                crop = resized_frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue
                thumb = cv2.resize(crop, (OBJECT_SIZE, OBJECT_SIZE))

                if display_y + OBJECT_SIZE + MARGIN + TEXT_HEIGHT > height:
                    break

                x_thumb = width - OBJECT_SIZE - MARGIN
                annotated_frame[display_y:display_y+OBJECT_SIZE, x_thumb:x_thumb+OBJECT_SIZE] = thumb
                put_text_with_background(annotated_frame, label, (x_thumb, display_y+OBJECT_SIZE+MARGIN), font_scale=0.6)

                display_y += OBJECT_SIZE + MARGIN + TEXT_HEIGHT + MARGIN

            results_vehicle = model_vehicle(resized_frame, conf=0.3)
            # Tạo 1 list tạm để lưu ID của các object hiện frame này
            current_ids = []

            for box in results_vehicle[0].boxes:
                cls_id = int(box.cls[0])
                cls_name = model_vehicle.names[cls_id]

                if cls_name not in target_vehicle_classes:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                label = f"{cls_name} {box.conf[0]:.2f}"
                bbox_color = (255, 255, 255)
                is_violation = False

                # Tạo ID object bằng cách tăng dần (đơn giản)
                id_counter += 1
                object_id = f"id{id_counter}"
                current_ids.append(object_id)
                object_tracks[object_id].append((cx, cy))
                if len(object_tracks[object_id]) > DIRECTION_THRESHOLD:
                    object_tracks[object_id] = object_tracks[object_id][-DIRECTION_THRESHOLD:]

                if len(object_tracks[object_id]) >= 2:
                    dy = object_tracks[object_id][-1][1] - object_tracks[object_id][0][1]
                    if dy < -15:  # moving up
                        label += " - WRONG WAY"
                        bbox_color = (0, 0, 255)
                        is_violation = True

                for zone_idx, (zone_points, _) in enumerate(scaled_zones):
                    pts = np.array(zone_points, np.int32).reshape((-1, 2))
                    if cv2.pointPolygonTest(pts, (cx, cy), False) >= 0:
                        if cls_name not in zone_allowed_vehicles.get(zone_idx, []):
                            label += " - ZONE VIOLATION"
                            bbox_color = (0, 0, 255)
                            is_violation = True
                        break

                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), bbox_color, 2)
                put_text_with_background(annotated_frame, label, (x1, y1 - 5), font_scale=0.5)
                cv2.circle(annotated_frame, (cx, cy), 4, (0, 255, 255), -1)

            # Xóa track của object không còn xuất hiện trong frame
            for obj_id in list(object_tracks.keys()):
                if obj_id not in current_ids:
                    del object_tracks[obj_id]

            # cv2.line(annotated_frame, (0, LINE_Y), (width, LINE_Y), (0, 255, 0), 2)
            # put_text_with_background(annotated_frame, "Correct Direction → ↓", (10, LINE_Y - 10), font_scale=0.6)

            _, jpeg = cv2.imencode('.jpg', annotated_frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        if cap.isOpened():
            cap.release()
        print("✅ Stream ended.")

        
def stream_violation_video_service1(youtube_url: str, camera_id: int):
    import requests
    import json
    import numpy as np
    import cv2
    from shapely.geometry import Point, Polygon

    # KÍCH THƯỚC CHUẨN - phải giống với frontend
    STANDARD_WIDTH = 640
    STANDARD_HEIGHT = 480

    # Load models
    model_vehicle = YOLO("yolov8m.pt")
    model_light = YOLO("final.pt")

    # Load zones from Spring Boot API
    def fetch_camera_config(cid: int):
        url = f"http://localhost:8081/api/cameras/{cid}"
        try:
            res = requests.get(url)
            res.raise_for_status()
            return res.json()
        except Exception as e:
            print(f"Error fetching zones: {e}")
            return None

    camera_config = fetch_camera_config(camera_id)
    if not camera_config:
        raise ValueError("Could not fetch camera config")

    zones = camera_config["zones"]
    lane_movements = camera_config["laneMovements"]
    light_lane_links = camera_config["zoneLightLaneLinks"]

    def convert_coordinates_to_frame_size(standard_coords, frame_width, frame_height):
        """
        Chuyển đổi tọa độ từ kích thước chuẩn sang kích thước frame thực tế
        """
        scale_x = frame_width / STANDARD_WIDTH
        scale_y = frame_height / STANDARD_HEIGHT
        
        converted_coords = []
        for x, y in standard_coords:
            new_x = int(round(x * scale_x))
            new_y = int(round(y * scale_y))
            converted_coords.append([new_x, new_y])
        
        return np.array(converted_coords, dtype=np.int32)

    def point_below_line(point, line_start, line_end):
        """
        Kiểm tra điểm có ở phía dưới đường thẳng không (từ dưới màn hình lên trên)
        Trả về True nếu điểm ở phía dưới đường
        """
        x, y = point
        x1, y1 = line_start
        x2, y2 = line_end
        
        # Tính tích có hướng để xác định vị trí điểm so với đường thẳng
        cross_product = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
        
        # Nếu cross_product > 0, điểm ở bên trái đường (phía dưới trong hệ tọa độ màn hình)
        # Nếu cross_product < 0, điểm ở bên phải đường (phía trên trong hệ tọa độ màn hình) 
        return cross_product > 0

    def detect_line_crossing(prev_point, curr_point, line_start, line_end):
        """
        Kiểm tra xe có vượt qua line từ dưới lên trên không
        """
        if prev_point is None or curr_point is None:
            return False
            
        # Kiểm tra xe di chuyển từ phía dưới line lên phía trên line
        was_below = point_below_line(prev_point, line_start, line_end)
        is_above = not point_below_line(curr_point, line_start, line_end)
        
        return was_below and is_above

    # Parse zones và chuyển đổi tọa độ sẽ được thực hiện sau khi biết kích thước frame
    lane_zones_standard = {}
    light_zones_standard = {}
    zone_lines_standard = []

    for z in zones:
        # Tọa độ từ DB là tọa độ chuẩn (640x480)
        standard_points = json.loads(z["coordinates"])
        
        if z["zoneType"] == "lane":
            lane_zones_standard[z["id"]] = {
                "name": z["name"], 
                "coordinates": standard_points
            }
        elif z["zoneType"] == "light":
            light_zones_standard[z["id"]] = {
                "name": z["name"], 
                "coordinates": standard_points
            }
        elif z["zoneType"] == "line":
            zone_lines_standard.append({
                "id": z["id"],
                "name": z["name"],
                "coordinates": standard_points
            })

    # Build movement and light mappings
    lane_transitions = {(m["fromLaneZoneId"], m["toLaneZoneId"]) for m in lane_movements}
    light_control_map = {link["laneZoneId"]: link["lightZoneId"] for link in light_lane_links}

    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    # Biến để lưu zones đã chuyển đổi
    lane_zones = {}
    light_zones = {}
    zone_lines = []
    frame_size_initialized = False

    red_light_history = []
    track_zone_history = {}  # track_id: current_zone_id
    track_position_history = {}  # track_id: previous_position
    vehicle_violations = {}
    vehicle_violation_types = {}  # track_id: violation_type

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_annotated = frame.copy()
            h, w, _ = frame.shape

            # Khởi tạo zones với kích thước frame thực tế (chỉ làm 1 lần)
            if not frame_size_initialized:
                print(f"Frame size: {w}x{h}, Standard size: {STANDARD_WIDTH}x{STANDARD_HEIGHT}")
                
                # Chuyển đổi tọa độ từ chuẩn sang frame thực tế
                for zone_id, zone_data in lane_zones_standard.items():
                    frame_coords = convert_coordinates_to_frame_size(
                        zone_data["coordinates"], w, h
                    )
                    lane_zones[zone_id] = {
                        "name": zone_data["name"],
                        "polygon": frame_coords
                    }

                for zone_id, zone_data in light_zones_standard.items():
                    frame_coords = convert_coordinates_to_frame_size(
                        zone_data["coordinates"], w, h
                    )
                    light_zones[zone_id] = {
                        "name": zone_data["name"],
                        "polygon": frame_coords
                    }

                for line_data in zone_lines_standard:
                    frame_coords = convert_coordinates_to_frame_size(line_data["coordinates"], w, h)
                    zone_lines.append({
                        "id": line_data["id"],
                        "name": line_data["name"],
                        "coordinates": frame_coords
                    })

                frame_size_initialized = True
                print(f"Initialized {len(lane_zones)} lane zones, {len(light_zones)} light zones, {len(zone_lines)} lines")

            # Step 1: Vẽ zones lên frame
            for zone in lane_zones.values():
                cv2.polylines(frame_annotated, [zone["polygon"]], isClosed=True, color=(255, 255, 0), thickness=2)
                cx, cy = np.mean(zone["polygon"], axis=0).astype(int)
                cv2.putText(frame_annotated, zone["name"], (cx, cy), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            for zone in light_zones.values():
                cv2.polylines(frame_annotated, [zone["polygon"]], isClosed=True, color=(0, 0, 255), thickness=2)
                cx, cy = np.mean(zone["polygon"], axis=0).astype(int)
                cv2.putText(frame_annotated, zone["name"], (cx, cy), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            for line in zone_lines:
                cv2.polylines(frame_annotated, [line["coordinates"]], isClosed=False, color=(0, 255, 255), thickness=3)

            # Step 2: Detect đèn giao thông chỉ trong light zones
            red_detected_in_light_zone = False
            
            # Crop frame chỉ trong light zones để detect đèn
            for light_zone in light_zones.values():
                # Tạo mask cho light zone
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.fillPoly(mask, [light_zone["polygon"]], 255)
                
                # Crop frame theo light zone
                light_frame = cv2.bitwise_and(frame, frame, mask=mask)
                
                # Detect đèn trong vùng này
                light_results = model_light(light_frame)[0]
                zone_red_detected = any(
                    model_light.names[int(box.cls[0])].lower() == 'red' and float(box.conf[0]) > 0.5
                    for box in light_results.boxes
                )
                
                if zone_red_detected:
                    red_detected_in_light_zone = True
                    break
            
            red_light_history.append(red_detected_in_light_zone)
            if len(red_light_history) > 3:
                red_light_history.pop(0)
            is_red = red_light_history.count(True) > 1

            # Hiển thị trạng thái đèn
            cv2.putText(frame_annotated, f"Red Light: {'YES' if is_red else 'NO'}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                        (0, 0, 255) if is_red else (0, 255, 0), 2)

            # Hiển thị thông tin kích thước để debug
            cv2.putText(frame_annotated, f"Frame: {w}x{h} | Standard: {STANDARD_WIDTH}x{STANDARD_HEIGHT}",
                        (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # Step 3: Detect và track phương tiện
            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]

            if not results.boxes or results.boxes.id is None:
                continue

            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = model_vehicle.names[cls_id]
                if class_name not in ['car', 'truck', 'bus', 'motorbike', 'bicycle']:
                    continue

                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                track_id = int(results.boxes.id[i])

                # Lưu vị trí trước đó
                prev_position = track_position_history.get(track_id)
                track_position_history[track_id] = (cx, cy)

                # Xác định zone hiện tại của vehicle
                current_zone_id = None
                for z_id, z in lane_zones.items():
                    if cv2.pointPolygonTest(z["polygon"], (cx, cy), False) >= 0:
                        current_zone_id = z_id
                        break

                # Kiểm tra chuyển động giữa các zones
                prev_zone_id = track_zone_history.get(track_id)
                track_zone_history[track_id] = current_zone_id

                # Kiểm tra vi phạm vượt đèn đỏ (vượt qua line từ dưới lên khi đèn đỏ)
                if is_red and prev_position and len(zone_lines) > 0:
                    for line_data in zone_lines:
                        line_coords = line_data["coordinates"]
                        if len(line_coords) >= 2:
                            line_start = tuple(line_coords[0])
                            line_end = tuple(line_coords[1])
                            
                            # Kiểm tra xe có vượt qua line từ dưới lên không
                            if detect_line_crossing(prev_position, (cx, cy), line_start, line_end):
                                # Kiểm tra xe có đi đúng lane movement không
                                if (prev_zone_id and current_zone_id and 
                                    (prev_zone_id, current_zone_id) in lane_transitions):
                                    # Xe đi đúng lane nhưng vượt đèn đỏ
                                    vehicle_violations[track_id] = True
                                    vehicle_violation_types[track_id] = "RED_LIGHT"
                                    print(f"RED LIGHT VIOLATION: Vehicle {track_id} crossed line from zone {prev_zone_id} to {current_zone_id} during red light")

                # Kiểm tra vi phạm đi sai làn (wrong way) khi đèn xanh
                if (not is_red and prev_zone_id and current_zone_id and 
                    prev_zone_id != current_zone_id and 
                    (prev_zone_id, current_zone_id) not in lane_transitions):
                    # Xe đi sai lane khi đèn xanh
                    vehicle_violations[track_id] = True
                    vehicle_violation_types[track_id] = "WRONG_WAY"
                    print(f"WRONG WAY VIOLATION: Vehicle {track_id} moved from zone {prev_zone_id} to {current_zone_id} (not allowed movement)")

                # Vẽ bounding box và label
                violation_type = vehicle_violation_types.get(track_id, "")
                color = (0, 0, 255) if vehicle_violations.get(track_id) else (0, 255, 0)
                
                if vehicle_violations.get(track_id):
                    violation_text = violation_type
                else:
                    violation_text = "OK"
                    
                label = f"ID:{track_id} {class_name} {violation_text}"
                
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                # Hiển thị zone hiện tại
                if current_zone_id:
                    zone_text = f"Zone: {lane_zones[current_zone_id]['name']}"
                    cv2.putText(frame_annotated, zone_text, (x1, y2 + 20), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

            # Step 4: Stream video
            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()