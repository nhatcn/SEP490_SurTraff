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


def stream_violation_video_service1(youtube_url: str, camera_id: int):
    import requests
    import json
    import numpy as np
    import cv2
    from shapely.geometry import Point, Polygon

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

    def convert_percentage_to_frame(percentage_coords, frame_width, frame_height):
        """
        Chuyển đổi tọa độ phần trăm (0-100%) sang tọa độ pixel thực tế của frame
        """
        converted_coords = []
        for x_percent, y_percent in percentage_coords:
            # Chuyển từ phần trăm sang pixel
            x_pixel = int(round((x_percent / 100.0) * frame_width))
            y_pixel = int(round((y_percent / 100.0) * frame_height))
            
            # Đảm bảo tọa độ không vượt quá frame
            x_pixel = max(0, min(frame_width - 1, x_pixel))
            y_pixel = max(0, min(frame_height - 1, y_pixel))
            
            converted_coords.append([x_pixel, y_pixel])
        
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

    # Parse zones - tọa độ từ DB sẽ là phần trăm (0-100%)
    lane_zones_percentage = {}
    light_zones_percentage = {}
    zone_lines_percentage = []

    for z in zones:
        # Tọa độ từ DB là phần trăm (0-100%)
        percentage_coords = json.loads(z["coordinates"])
        
        if z["zoneType"] == "lane":
            lane_zones_percentage[z["id"]] = {
                "name": z["name"], 
                "coordinates": percentage_coords
            }
        elif z["zoneType"] == "light":
            light_zones_percentage[z["id"]] = {
                "name": z["name"], 
                "coordinates": percentage_coords
            }
        elif z["zoneType"] == "line":
            zone_lines_percentage.append({
                "id": z["id"],
                "name": z["name"],
                "coordinates": percentage_coords
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

    red_light_history = {zone_id: deque(maxlen=red_light_buffer_size) for zone_id in light_zones_percentage}
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
                print(f"Frame size: {w}x{h}")
                print(f"Converting percentage coordinates to frame coordinates...")
                
                # Chuyển đổi tọa độ phần trăm sang frame thực tế
                for zone_id, zone_data in lane_zones_percentage.items():
                    frame_coords = convert_percentage_to_frame(
                        zone_data["coordinates"], w, h
                    )
                    lane_zones[zone_id] = {
                        "name": zone_data["name"],
                        "polygon": frame_coords
                    }
                    print(f"Lane zone {zone_id} ({zone_data['name']}): {len(frame_coords)} points")

                for zone_id, zone_data in light_zones_percentage.items():
                    frame_coords = convert_percentage_to_frame(
                        zone_data["coordinates"], w, h
                    )
                    light_zones[zone_id] = {
                        "name": zone_data["name"],
                        "polygon": frame_coords
                    }
                    print(f"Light zone {zone_id} ({zone_data['name']}): {len(frame_coords)} points")

                for line_data in zone_lines_percentage:
                    frame_coords = convert_percentage_to_frame(line_data["coordinates"], w, h)
                    zone_lines.append({
                        "id": line_data["id"],
                        "name": line_data["name"],
                        "coordinates": frame_coords
                    })
                    print(f"Line {line_data['id']} ({line_data['name']}): {len(frame_coords)} points")

                frame_size_initialized = True
                print(f"Initialized {len(lane_zones)} lane zones, {len(light_zones)} light zones, {len(zone_lines)} lines")

            # Step 1: Vẽ zones lên frame
            for zone_id, zone in lane_zones.items():
                cv2.polylines(frame_annotated, [zone["polygon"]], isClosed=True, color=(255, 255, 0), thickness=2)
                if len(zone["polygon"]) > 0:
                    cx, cy = np.mean(zone["polygon"], axis=0).astype(int)
                    cv2.putText(frame_annotated, f"Lane: {zone['name']}", (cx, cy), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            # Step 2: Vẽ light zones và hiển thị trạng thái đèn
            for light_zone_id, light_zone in light_zones.items():
                cv2.polylines(frame_annotated, [light_zone["polygon"]], isClosed=True, color=(0, 0, 255), thickness=2)
                if len(light_zone["polygon"]) > 0:
                    # Tìm lane zone liên kết với light zone này
                    lane_zone_id = next((k for k, v in light_control_map.items() if v == light_zone_id), None)
                    lane_zone_name = lane_zones[lane_zone_id]["name"] if lane_zone_id in lane_zones else "Unknown"
                    
                    # Tìm tọa độ y nhỏ nhất (đỉnh trên cùng) để đặt label
                    top_y = int(np.min(light_zone["polygon"][:, 1]))
                    cx = int(np.mean(light_zone["polygon"][:, 0]))
                    cv2.putText(frame_annotated, f"Light of Zone: {lane_zone_name}", 
                               (cx, top_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

                    # Detect đèn trong light zone
                    mask = np.zeros((h, w), dtype=np.uint8)
                    cv2.fillPoly(mask, [light_zone["polygon"]], 255)
                    light_frame = cv2.bitwise_and(frame, frame, mask=mask)
                    light_results = model_light(light_frame)[0]
                    zone_red_detected = any(
                        model_light.names[int(box.cls[0])].lower() == 'red' and float(box.conf[0]) > 0.5
                        for box in light_results.boxes
                    )
                    
                    # Cập nhật lịch sử đèn cho light zone này
                    red_light_history[light_zone_id].append(zone_red_detected)
                    is_red = red_light_history[light_zone_id].count(True) > 1

                    # Hiển thị trạng thái đèn ở dưới cùng của light zone
                    bottom_y = int(np.max(light_zone["polygon"][:, 1]))
                    status_text = "Red" if is_red else "Green"
                    status_color = (0, 0, 255) if is_red else (0, 255, 0)
                    cv2.putText(frame_annotated, status_text, (cx, bottom_y + 20), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

            for line in zone_lines:
                if len(line["coordinates"]) >= 2:
                    cv2.polylines(frame_annotated, [line["coordinates"]], isClosed=False, color=(0, 255, 255), thickness=3)
                    mid_point = line["coordinates"][len(line["coordinates"])//2]
                    cv2.putText(frame_annotated, f"Line: {line['name']}", tuple(mid_point), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

            # Step 3: Detect và track phương tiện
            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]

            if results.boxes is not None and results.boxes.id is not None:
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

                    # Kiểm tra vi phạm vượt đèn đỏ
                    if prev_position and len(zone_lines) > 0:
                        for line_data in zone_lines:
                            line_coords = line_data["coordinates"]
                            if len(line_coords) >= 2:
                                line_start = tuple(line_coords[0])
                                line_end = tuple(line_coords[1])
                                
                                if detect_line_crossing(prev_position, (cx, cy), line_start, line_end):
                                    if prev_zone_id and current_zone_id and (prev_zone_id, current_zone_id) in lane_transitions:
                                        # Kiểm tra trạng thái đèn của lane zone hiện tại
                                        light_zone_id = light_control_map.get(current_zone_id)
                                        if light_zone_id and red_light_history[light_zone_id].count(True) > 1:
                                            vehicle_violations[track_id] = True
                                            vehicle_violation_types[track_id] = "RED_LIGHT"
                                            print(f"RED LIGHT VIOLATION: Vehicle {track_id} crossed line from zone {prev_zone_id} to {current_zone_id} during red light")

                    # Kiểm tra vi phạm đi sai làn
                    if (not red_light_history.get(light_control_map.get(current_zone_id, None), deque([False])).count(True) > 1 and 
                        prev_zone_id and current_zone_id and 
                        prev_zone_id != current_zone_id and 
                        (prev_zone_id, current_zone_id) not in lane_transitions):
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
                    if current_zone_id and current_zone_id in lane_zones:
                        zone_text = f"Zone: {lane_zones[current_zone_id]['name']}"
                        cv2.putText(frame_annotated, zone_text, (x1, y2 + 20), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

            # Step 4: Stream video với frame đầy đủ
            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    except Exception as e:
        print(f"Error in stream_violation_video_service1: {e}")
        traceback.print_exc()
    finally:
        cap.release()


def extract_thumbnail_from_stream_url(youtube_url: str) -> bytes:
    """
    Trích xuất thumbnail (ảnh JPEG đầu tiên) từ stream YouTube.
    """
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Không thể mở stream từ URL.")

    frame = None
    for _ in range(10):
        ret, temp_frame = cap.read()
        if ret and temp_frame is not None:
            frame = temp_frame
            break

    cap.release()

    if frame is None:
        raise ValueError("Không thể đọc frame từ stream sau nhiều lần thử.")

    ret, buffer = cv2.imencode(".jpg", frame)
    if not ret:
        raise ValueError("Lỗi khi encode frame thành JPEG.")

    return buffer.tobytes()