import cv2
import numpy as np
from ultralytics import YOLO
from datetime import datetime
from database import SessionLocal
from models.model import Violation, VehicleTracking, VehicleType
from sqlalchemy import select
import os
import requests
import json
from collections import deque

def stream_overspeed_video_service(youtube_url: str, camera_id: int, speed_limit_kmh: float = 60.0, pixels_per_meter: float = 10.0):
    """
    Dịch vụ truyền luồng video để phát hiện và lưu vi phạm vượt tốc độ.

    Args:
        youtube_url (str): URL của luồng video YouTube.
        camera_id (int): ID của camera.
        speed_limit_kmh (float): Giới hạn tốc độ (km/h, mặc định: 60).
        pixels_per_meter (float): Hệ số chuyển đổi pixel sang mét (mặc định: 10 pixel/mét).
    """
    # Khởi tạo mô hình YOLO
    model_vehicle = YOLO("yolov8m.pt")
    model_plate = YOLO("best90.pt")  # Mô hình nhận diện biển số

    # Lấy URL luồng
    from utils.yt_stream import get_stream_url
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Không thể mở luồng video")

    # Khởi tạo cơ sở dữ liệu
    db = SessionLocal()

    # Tạo thư mục lưu video và ảnh
    VIOLATIONS_DIR = "violations"
    os.makedirs(VIOLATIONS_DIR, exist_ok=True)

    # Từ điển lưu trạng thái phương tiện
    vehicle_states = {}  # track_id: {prev_center, timestamp, speed, violated, video_saved}
    frame_buffer = deque(maxlen=30)  # Lưu 1 giây video (30 FPS)
    recording_tasks = {}  # track_id: {writer, frames_remaining, file_path}

    # Lấy tốc độ khung hình
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    # Kích thước chuẩn
    STANDARD_WIDTH = 640
    STANDARD_HEIGHT = 480

    # Định nghĩa trực tiếp hai vạch đo tốc độ
    speed_lines_standard = [
        [[231, 264], [430, 117]],  # Vạch 1
        [[536, 479], [787, 193]]   # Vạch 2
    ]
    speed_lines = []
    frame_size_initialized = False

    def convert_coordinates_to_frame_size(standard_coords, frame_width, frame_height):
        scale_x = frame_width / STANDARD_WIDTH
        scale_y = frame_height / STANDARD_HEIGHT
        converted = [[min(int(round(x * scale_x)), frame_width - 1), min(int(round(y * scale_y)), frame_height - 1)] for x, y in standard_coords]
        print(f"Tọa độ đã chuyển đổi: {converted}")
        return np.array(converted, dtype=np.int32)

    # Ánh xạ tên lớp YOLO sang vehicle_type_id
    def get_vehicle_type_id(class_name):
        class_to_type = {
            'car': 'Car',
            'truck': 'Truck',
            'bus': 'Bus',
            'motorbike': 'Motorbike',
            'bicycle': 'Bicycle'
        }
        type_name = class_to_type.get(class_name.lower())
        if type_name:
            result = db.execute(select(VehicleType.id).where(VehicleType.type_name == type_name)).scalar()
            return result
        return None

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_annotated = frame.copy()
            frame_for_video = frame.copy()
            h, w, _ = frame.shape
            current_time = datetime.now()

            # Khởi tạo vạch
            if not frame_size_initialized:
                print(f"Kích thước khung hình: {w}x{h}, Kích thước chuẩn: {STANDARD_WIDTH}x{STANDARD_HEIGHT}")
                speed_lines.clear()  # Xóa danh sách cũ để tránh trùng lặp
                for line_coords in speed_lines_standard:
                    frame_coords = convert_coordinates_to_frame_size(line_coords, w, h)
                    speed_lines.append(frame_coords)
                frame_size_initialized = True
                print(f"Đã khởi tạo {len(speed_lines)} vạch đo tốc độ: {speed_lines}")

            # Vẽ vạch
            colors = [(0, 255, 255), (255, 255, 0)]  # Vạch 1: Vàng, Vạch 2: Xanh lam
            for i, line in enumerate(speed_lines):
                print(f"Đang vẽ vạch {i+1}: {line}")
                cv2.polylines(frame_annotated, [line], isClosed=False, color=colors[i], thickness=3)
                cv2.polylines(frame_for_video, [line], isClosed=False, color=colors[i], thickness=3)
                cx, cy = np.mean(line, axis=0).astype(int)
                cv2.putText(frame_annotated, f"Vach {i+1}", (cx, cy - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, colors[i], 2)

            # Lưu khung hình vào bộ đệm
            frame_buffer.append(frame_for_video.copy())

            # Phát hiện phương tiện
            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]

            if results.boxes is None or results.boxes.id is None:
                cv2.imshow("Debug Frame", frame_annotated)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
                )
                continue

            # Phát hiện biển số
            plate_results = model_plate(frame)[0]
            plate_detections = {}
            for box in plate_results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if conf < 0.5:
                    continue
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                plate_detections[(x1, y1, x2, y2)] = model_plate.names[cls_id]

            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = model_vehicle.names[cls_id]
                conf = float(results.boxes.conf[i])
                track_id = int(results.boxes.id[i])

                if class_name not in ['car', 'truck', 'bus', 'motorbike', 'bicycle'] or conf < 0.3:
                    continue

                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                center_x, center_y = (x1 + x2) / 2, (y1 + y2) / 2
                current_center = np.array([center_x, center_y])

                # Tìm biển số trong vùng hộp giới hạn
                license_plate = "Unknown"
                for (px1, py1, px2, py2), plate in plate_detections.items():
                    if px1 >= x1 and px2 <= x2 and py1 >= y1 and py2 <= y2:
                        license_plate = plate
                        break

                if track_id not in vehicle_states:
                    vehicle_states[track_id] = {
                        'prev_center': current_center,
                        'timestamp': current_time.timestamp(),
                        'speed_kmh': 0.0,
                        'violated': False,
                        'video_saved': False,
                        'crossed_line_1': False,
                        'crossed_line_2': False,
                        'time_line_1': None,
                        'class_name': class_name,
                        'license_plate': license_plate
                    }
                else:
                    prev_center = vehicle_states[track_id]['prev_center']
                    prev_time = vehicle_states[track_id]['timestamp']
                    y_line_1 = speed_lines[0][0][1]
                    y_line_2 = speed_lines[1][0][1]
                    prev_y = prev_center[1]
                    current_y = current_center[1]

                    if not vehicle_states[track_id]['crossed_line_1'] and prev_y < y_line_1 <= current_y:
                        vehicle_states[track_id]['crossed_line_1'] = True
                        vehicle_states[track_id]['time_line_1'] = current_time.timestamp()
                    elif vehicle_states[track_id]['crossed_line_1'] and not vehicle_states[track_id]['crossed_line_2'] and prev_y < y_line_2 <= current_y:
                        vehicle_states[track_id]['crossed_line_2'] = True
                        time_line_2 = current_time.timestamp()
                        time_diff = time_line_2 - vehicle_states[track_id]['time_line_1']

                        if time_diff > 0:
                            pixel_distance = abs(y_line_2 - y_line_1)
                            distance_meters = pixel_distance / pixels_per_meter
                            speed_ms = distance_meters / time_diff
                            speed_kmh = speed_ms * 3.6
                            vehicle_states[track_id]['speed_kmh'] = speed_kmh

                            if speed_kmh > speed_limit_kmh:
                                vehicle_states[track_id]['violated'] = True

                                if not vehicle_states[track_id]['video_saved']:
                                    timestamp = current_time.strftime("%Y%m%d_%H%M%S")
                                    video_filename = f"overspeed_{track_id}_{timestamp}.mp4"
                                    image_filename = f"overspeed_{track_id}_{timestamp}.jpg"
                                    video_filepath = os.path.join(VIOLATIONS_DIR, video_filename)
                                    image_filepath = os.path.join(VIOLATIONS_DIR, image_filename)

                                    # Lưu ảnh chụp nhanh
                                    cv2.imwrite(image_filepath, frame_annotated)

                                    # Lưu video
                                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                                    writer = cv2.VideoWriter(video_filepath, fourcc, fps, (w, h))
                                    for buf_frame in frame_buffer:
                                        writer.write(buf_frame)

                                    recording_tasks[track_id] = {
                                        'writer': writer,
                                        'frames_remaining': 30,
                                        'video_path': video_filepath,
                                        'image_path': image_filepath
                                    }

                                    vehicle_states[track_id]['video_saved'] = True

                                    # Lưu vào Violations
                                    violation = Violation(
                                        camera_id=camera_id,
                                        violation_type_id=db.execute(
                                            select(ViolationType.id).where(ViolationType.type_name == "Overspeed")
                                        ).scalar() or 1,
                                        vehicle_type_id=get_vehicle_type_id(class_name),
                                        license_plate=license_plate,
                                        vehicle_color="Unknown",
                                        vehicle_brand="Unknown",
                                        image_url=image_filepath,
                                        video_url=video_filepath,
                                        violation_time=current_time,
                                        created_at=current_time
                                    )
                                    db.add(violation)

                                    # Lưu vào VehicleTracking
                                    tracking = VehicleTracking(
                                        camera_id=camera_id,
                                        license_plate=license_plate,
                                        vehicle_type_id=get_vehicle_type_id(class_name),
                                        vehicle_color="Unknown",
                                        vehicle_brand="Unknown",
                                        speed=speed_kmh,
                                        image_url=image_filepath,
                                        detection_time=current_time,
                                        created_at=current_time
                                    )
                                    db.add(tracking)

                                    try:
                                        db.commit()
                                    except Exception as e:
                                        print(f"Lỗi lưu vào cơ sở dữ liệu: {e}")
                                        db.rollback()

                    vehicle_states[track_id]['prev_center'] = current_center
                    vehicle_states[track_id]['timestamp'] = current_time.timestamp()
                    vehicle_states[track_id]['license_plate'] = license_plate

                # Vẽ hộp giới hạn và nhãn
                color = (0, 0, 255) if vehicle_states[track_id]['violated'] else (0, 255, 0)
                label = f"ID:{track_id} {class_name} {vehicle_states[track_id]['speed_kmh']:.1f} km/h LP:{license_plate}"
                if vehicle_states[track_id]['violated']:
                    label += " VƯỢT TỐC ĐỘ"
                    cv2.rectangle(frame_for_video, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame_for_video, label, (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # Xử lý video đang ghi
            for track_id in list(recording_tasks.keys()):
                task = recording_tasks[track_id]
                if task['frames_remaining'] > 0:
                    task['writer'].write(frame_for_video)
                    task['frames_remaining'] -= 1
                else:
                    task['writer'].release()
                    del recording_tasks[track_id]

            # Hiển thị giới hạn tốc độ
            cv2.putText(frame_annotated, f"Giới hạn tốc độ: {speed_limit_kmh} km/h",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

            # Lưu khung hình để gỡ lỗi
            cv2.imwrite("debug_frame.jpg", frame_annotated)

            # Hiển thị khung hình để kiểm tra trực tiếp
            cv2.imshow("Debug Frame", frame_annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()
        db.close()
        for task in recording_tasks.values():
            task['writer'].release()
        cv2.destroyAllWindows()