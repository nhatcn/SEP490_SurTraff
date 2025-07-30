import os
import cv2
import math
import time
import requests
import json
import numpy as np
from datetime import datetime
from collections import deque, defaultdict
from ultralytics import YOLO
import traceback
from utils.yt_stream import get_stream_url

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)

# Helper function for text with background
def put_text_with_background(img, text, org, font_scale, color, thickness=1, bg_color=(0, 0, 0)):
    (text_width, text_height), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
    x, y = org
    # Ensure coordinates are within image bounds
    x = max(0, x)
    # y is the baseline for put_text_with_background, so ensure it's below the top edge for text to be visible
    y = max(text_height + baseline, y)
    x_end = min(img.shape[1], x + text_width)
    y_end = min(img.shape[0], y + baseline)
    
    # Draw background rectangle
    cv2.rectangle(img, (x, y - text_height - baseline), (x_end, y_end), bg_color, -1)
    # Put text
    cv2.putText(img, text, (x, y - baseline), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness)

def stream_violation_wrongway_video_service1(youtube_url: str, camera_id: int):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    # Load models
    model_sign_path = "trafficsign.pt"
    model_vehicle_path = "yolov8m.pt"
    try:
        model_sign = YOLO(model_sign_path)
        model_vehicle = YOLO(model_vehicle_path)
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        yield b"Error: Could not load AI models."
        return

    # Fetch camera configuration from API
    def fetch_camera_config(cid: int, retries=3, delay=1):
        url = f"http://localhost:8081/api/cameras/{cid}"
        for attempt in range(retries):
            try:
                res = requests.get(url)
                res.raise_for_status()
                return res.json()
            except Exception as e:
                print(f"Retry {attempt+1}/{retries}: Error fetching camera config: {e}")
                time.sleep(delay)
        raise ValueError("Failed to fetch camera config after retries")

    try:
        camera_config = fetch_camera_config(camera_id)
    except ValueError as e:
        print(f"❌ Error fetching camera config: {e}")
        yield b"Error: Could not fetch camera configuration."
        return

    if not camera_config:
        print("❌ No camera config found.")
        yield b"Error: No camera configuration found."
        return

    zones_data = camera_config.get("zones", [])

    # Get stream URL (user is responsible for this part)
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"❌ Cannot open stream from {stream_url}. Please ensure the URL is valid and accessible.")
        yield b"Error: Cannot open video stream. Please check the stream URL."
        return

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    width, height = 640, 640 # Fixed processing resolution for consistency with user's original code

    # Function to convert percentage coordinates to pixel coordinates
    def convert_percentage_to_frame(percentage_coords_str, frame_width, frame_height):
        converted_coords = []
        try:
            percentage_coords = json.loads(percentage_coords_str) # Parse JSON string
            for x_percent, y_percent in percentage_coords:
                x_pixel = int(round((x_percent / 100.0) * frame_width))
                y_pixel = int(round((y_percent / 100.0) * frame_height))
                x_pixel = max(0, min(frame_width - 1, x_pixel))
                y_pixel = max(0, min(frame_height - 1, y_pixel))
                converted_coords.append([x_pixel, y_pixel])
        except json.JSONDecodeError as e:
            print(f"Error decoding coordinates JSON: {e} for string: {percentage_coords_str}")
            return np.array([], dtype=np.int32).reshape(0, 2) # Return empty array on error
        return np.array(converted_coords, dtype=np.int32)

    # Define zone colors (BGR format)
    MOTORCYCLE_ZONE_COLOR = (255, 0, 0) # Blue
    CAR_TRUCK_ZONE_COLOR = (0, 255, 0)  # Green
    DEFAULT_ZONE_COLOR = (128, 128, 128) # Grey

    # Process zones from API
    lane_zones = {}
    zone_allowed_vehicles_mapping = {
        164: ['motorcycle'], # Lane Zone 1
        165: ['car', 'truck'], # Lane Zone 2
        166: ['car', 'truck'], # Lane Zone 3
        167: ['motorcycle'] # Lane Zone 4
    }
    for z in zones_data:
        if z["zoneType"] == "lane":
            frame_coords = convert_percentage_to_frame(z["coordinates"], width, height)
            if frame_coords.size > 0: # Only add if coordinates were successfully converted
                allowed_vehicles = zone_allowed_vehicles_mapping.get(z["id"], [])
                zone_color = DEFAULT_ZONE_COLOR
                # Assign blue if it's primarily a motorcycle zone (only motorcycle allowed)
                if 'motorcycle' in allowed_vehicles and 'car' not in allowed_vehicles and 'truck' not in allowed_vehicles:
                    zone_color = MOTORCYCLE_ZONE_COLOR
                # Assign green if it allows cars or trucks (even if it also allows motorcycles)
                elif 'car' in allowed_vehicles or 'truck' in allowed_vehicles:
                    zone_color = CAR_TRUCK_ZONE_COLOR

                lane_zones[z["id"]] = {
                    "name": z["name"],
                    "polygon": frame_coords,
                    "allowed_vehicles": allowed_vehicles,
                    "color": zone_color # Store the determined color
                }
                print(f"Loaded Lane Zone {z['id']} ({z['name']}) with {len(frame_coords)} points. Allowed: {lane_zones[z['id']]['allowed_vehicles']}, Color: {zone_color}")
            else:
                print(f"Skipping Lane Zone {z['id']} due to invalid coordinates: {z['coordinates']}")
        # Add other zone types if needed for sign detection zones, etc.
        # For now, the wrongway service only uses 'lane' zones for vehicle checks.

    # Constants for tracking and display
    object_tracks = defaultdict(lambda: deque(maxlen=5)) # Still track for potential future use or other analytics
    OBJECT_SIZE, MARGIN = 64, 10
    target_vehicle_classes = ['car', 'motorcycle', 'truck', 'bus'] # Added 'bus' as it's a common vehicle type

    print(f"🔴 Starting camera {camera_id}, original resolution: {original_width}x{original_height}, processing at {width}x{height}")

    # Use a dictionary to store violation status per track_id, including a flag if it's been recorded
    vehicle_violation_status = defaultdict(lambda: {"is_wrong_way": False, "recorded_wrong_way": False})

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Failed to read frame, attempting to reconnect...")
                cap.release()
                time.sleep(1) # Wait a bit before retrying
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    print("❌ Failed to reconnect to stream. Exiting.")
                    break
                continue

            resized_frame = cv2.resize(frame, (width, height))
            annotated_frame = resized_frame.copy()
            alpha = 0.4

            # Draw zones on the annotated frame
            for zone_id, zone_data in lane_zones.items():
                if zone_data["polygon"].size == 0: continue # Skip if polygon is empty
                overlay = annotated_frame.copy()
                pts = zone_data["polygon"].reshape((-1, 1, 2))
                color = zone_data["color"] # Use the stored color
                cv2.fillPoly(overlay, [pts], color)
                cv2.addWeighted(overlay, alpha, annotated_frame, 1 - alpha, 0, annotated_frame)
                cv2.polylines(annotated_frame, [pts], True, color, 2)
                # User requested NOT to display zone names/numbers, so this part is commented out
                # if len(zone_data["polygon"]) > 0:
                #     cx_zone, cy_zone = np.mean(zone_data["polygon"], axis=0).astype(int)
                #     put_text_with_background(annotated_frame, f"Zone {zone_data['name']}", (cx_zone, cy_zone), 0.5, (255, 255, 255))

            # Traffic Sign Detection
            results_sign = model_sign(resized_frame, conf=0.1)
            boxes_sign = results_sign[0].boxes
            
            # Variables for horizontal sign display
            sign_display_y_fixed = MARGIN # Fixed Y position for the row of signs (top of the frame)
            current_sign_x = width - MARGIN # Start from the right edge, move left for each sign

            for i, box in enumerate(boxes_sign):
                cls_id = int(box.cls)
                label = model_sign.names[cls_id]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                x1, y1, x2, y2 = max(0, x1), max(0, y1), min(width, x2), min(height, y2)
                if x2 <= x1 or y2 <= y1:
                    continue
                
                crop = resized_frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue
                thumb = cv2.resize(crop, (OBJECT_SIZE, OBJECT_SIZE))

                # Calculate x position for the current sign thumbnail
                x_thumb = current_sign_x - OBJECT_SIZE
                
                # Check if the sign thumbnail would go off-screen to the left
                # Estimate text height for this check (a reasonable estimate for font_scale=0.6)
                estimated_text_height = 25 
                if x_thumb < MARGIN or (sign_display_y_fixed + OBJECT_SIZE + MARGIN + estimated_text_height) > height:
                    break # Stop displaying signs if no more space horizontally or vertically

                # Place the thumbnail
                annotated_frame[sign_display_y_fixed : sign_display_y_fixed + OBJECT_SIZE, 
                                x_thumb : x_thumb + OBJECT_SIZE] = thumb
                
                # Draw bounding box around the sign thumbnail
                cv2.rectangle(annotated_frame, (x_thumb, sign_display_y_fixed), 
                              (x_thumb + OBJECT_SIZE, sign_display_y_fixed + OBJECT_SIZE), (0, 165, 255), 2)

                # Position text below the thumbnail. org is the baseline for put_text_with_background.
                text_org_x = x_thumb
                text_org_y = sign_display_y_fixed + OBJECT_SIZE + MARGIN 
                
                put_text_with_background(annotated_frame, label, (text_org_x, text_org_y), font_scale=0.6, color=(255, 255, 255))
                
                # Update x for the next sign (move further left, including margin)
                current_sign_x = x_thumb - MARGIN 

            # Vehicle Detection and Tracking
            results_vehicle = model_vehicle.track(source=resized_frame, persist=True, conf=0.3, iou=0.5, tracker="bytetrack.yaml")[0]
            current_frame_track_ids = set()
            if results_vehicle.boxes is not None and results_vehicle.boxes.id is not None:
                for i in range(len(results_vehicle.boxes)):
                    cls_id = int(results_vehicle.boxes.cls[i])
                    cls_name = model_vehicle.names[cls_id]
                    if cls_name not in target_vehicle_classes:
                        continue
                    x1, y1, x2, y2 = map(int, results_vehicle.boxes.xyxy[i])
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    track_id = int(results_vehicle.boxes.id[i])
                    current_frame_track_ids.add(track_id)
                    object_tracks[track_id].append((cx, cy))

                    # Reset violation flag for this frame
                    vehicle_violation_status[track_id]["is_wrong_way"] = False

                    label = f"ID:{track_id} {cls_name}"
                    bbox_color = (0, 255, 0) # Default to green (OK)
                    current_zone_id = 0 # Default to 0 if not in any defined zone

                    # Check for Wrong Way Violation (vehicle type not allowed in current zone)
                    found_zone = False
                    for z_id, z_data in lane_zones.items():
                        if z_data["polygon"].size == 0: continue # Skip if polygon is empty
                        if cv2.pointPolygonTest(z_data["polygon"], (cx, cy), False) >= 0:
                            current_zone_id = z_id
                            found_zone = True
                            if cls_name not in z_data["allowed_vehicles"]:
                                vehicle_violation_status[track_id]["is_wrong_way"] = True # This is the new 'wrong way' definition
                                bbox_color = (0, 0, 255) # Red for violation
                                label += f" - WRONG WAY ({z_data['name']})"
                                print(f"WRONG WAY VIOLATION (Zone): Vehicle {track_id} ({cls_name}) in zone {z_data['name']} (ID: {z_id}) - not allowed.")
                                # Save violation to database (only if not already recorded for this track_id)
                                if not vehicle_violation_status[track_id]['recorded_wrong_way']:
                                    # db_session = SessionLocal() # Assuming SessionLocal and ViolationCreate are defined elsewhere
                                    try:
                                        # Removed cv2.imwrite line here
                                        # violation_data = ViolationCreate(
                                        #     camera_id=camera_id,
                                        #     vehicle_type=cls_name,
                                        #     violation_type="WRONG_WAY", # Use "WRONG_WAY" for this type of violation
                                        #     timestamp=datetime.now(),
                                        #     track_id=track_id,
                                        #     zone_id=current_zone_id,
                                        #     image_path=os.path.join(VIOLATIONS_DIR, f"violation_wrong_way_{track_id}_{int(time.time())}.jpg")
                                        # )
                                        # violation_crud.create_violation(db_session, violation_data)
                                        vehicle_violation_status[track_id]['recorded_wrong_way'] = True
                                    except Exception as db_e:
                                        print(f"Error saving WRONG_WAY violation to DB: {db_e}")
                                        traceback.print_exc()
                                    # finally:
                                        # db_session.close()
                            else:
                                # Reset recorded flag if no longer a wrong way violation
                                vehicle_violation_status[track_id]['recorded_wrong_way'] = False
                            break # Found the zone, no need to check others

                    # If vehicle is not in any defined lane zone, reset wrong way flag
                    if not found_zone:
                        vehicle_violation_status[track_id]['recorded_wrong_way'] = False

                    # Determine final label and color based on the single 'is_wrong_way' flag
                    if vehicle_violation_status[track_id]["is_wrong_way"]:
                        bbox_color = (0, 0, 255)
                        label = f"ID:{track_id} {cls_name} - WRONG WAY"
                    else:
                        bbox_color = (0, 255, 0) # Green if no violation
                        label = f"ID:{track_id} {cls_name} - OK"

                    # Draw bounding box and label
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), bbox_color, 2)
                    put_text_with_background(annotated_frame, label, (x1, y1 - 5), font_scale=0.5, color=bbox_color)
                    cv2.circle(annotated_frame, (cx, cy), 4, (0, 255, 255), -1)

            # Clean up tracks of objects no longer appearing in the current frame
            # Iterate over a copy of keys to allow modification during iteration
            for obj_id in list(object_tracks.keys()):
                if obj_id not in current_frame_track_ids:
                    del object_tracks[obj_id]
                    # Also remove violation status for this track_id
                    if obj_id in vehicle_violation_status:
                        del vehicle_violation_status[obj_id]

            # Encode and yield the annotated frame
            _, jpeg = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    except Exception as e:
        print(f"Error in stream_violation_wrongway_video_service1: {e}")
        traceback.print_exc()
        yield b"Error: An unexpected error occurred during streaming."
    finally:
        if cap.isOpened():
            cap.release()
        print("✅ Stream ended.")

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
