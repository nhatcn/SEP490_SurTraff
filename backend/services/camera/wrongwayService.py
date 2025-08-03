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
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor
import atexit
from utils.yt_stream import get_stream_url # Assuming this utility exists

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
VIOLATION_API_URL = "http://localhost:8081/api/violations"

# Thread pool for async violation sending
violation_executor = ThreadPoolExecutor(max_workers=5)

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

def save_temp_violation_video(frames, fps, output_path, width, height):
    """Save a list of frames to a temporary video file."""
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    for frame in frames:
        out.write(frame)
    out.release()

def send_violation_async(violation_data, image_path, video_path, track_id):
    """Send violation to API asynchronously"""
    def send_violation():
        try:
            with open(image_path, 'rb') as img_file, open(video_path, 'rb') as vid_file:
                files = {
                    'imageFile': ('violation.jpg', img_file, 'image/jpeg'),
                    'videoFile': ('violation.mp4', vid_file, 'video/mp4'),
                    'Violation': (None, json.dumps(violation_data), 'application/json')
                }
                response = requests.post(VIOLATION_API_URL, files=files, timeout=10)
                response.raise_for_status()
                print(f"✅ Violation sent successfully for track {track_id}: {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to send violation to API for track {track_id}: {e}")
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(image_path):
                    os.remove(image_path)
                if os.path.exists(video_path):
                    os.remove(video_path)
                print(f"🗑️ Cleaned up temp files for track {track_id}")
            except Exception as e:
                print(f"⚠️ Error deleting temp files for track {track_id}: {e}")
    # Submit to thread pool for async execution
    violation_executor.submit(send_violation)

def cleanup_on_exit():
    """Clean up thread pool on exit"""
    print("🛑 Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("✅ Violation executor shutdown complete")

# Register cleanup function
atexit.register(cleanup_on_exit)

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

    if not cap.isOpened():
        print(f"❌ Cannot open stream from {stream_url}. Please ensure the URL is valid and accessible.")
        yield b"Error: Cannot open video stream. Please check the stream URL."
        return

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Fixed processing resolution for consistency with user's original code
    # We will upscale the final output frame back to original_width, original_height
    processing_width, processing_height = 640, 640 

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

    # Define zone colors (BGR format) - Using distinct colors as requested
    MOTORCYCLE_ZONE_COLOR = (255, 0, 0)    # Blue for motorcycle-only lanes
    CAR_TRUCK_ZONE_COLOR = (0, 165, 255)  # Orange for car/truck lanes (changed from green for better distinction)
    DEFAULT_ZONE_COLOR = (128, 128, 128)  # Grey for other or undefined lanes

    # This mapping defines which vehicle types are allowed based on the ZONE NAME.
    # This approach avoids hardcoding specific zone IDs, making it more flexible
    # if zone IDs change but their names/purposes remain consistent.
    # ASSUMPTION: The zone names (e.g., "Lane Zone 1", "Lane Zone 2") consistently
    # imply the allowed vehicle types across different camera configurations.
    zone_name_to_allowed_vehicles_mapping = {
        "Lane Zone 1": ['motorcycle'],
        "Lane Zone 2": ['car', 'truck'],
        "Lane Zone 3": ['car', 'truck'],
        "Lane Zone 4": ['motorcycle']
    }

    # Process zones from API
    lane_zones = {}
    for z in zones_data:
        if z["zoneType"] == "lane":
            # Convert coordinates based on the PROCESSING resolution
            frame_coords = convert_percentage_to_frame(z["coordinates"], processing_width, processing_height)
            if frame_coords.size > 0: # Only add if coordinates were successfully converted
                # Get allowed vehicles from the mapping based on zone NAME
                allowed_vehicles = zone_name_to_allowed_vehicles_mapping.get(z["name"], [])
                zone_color = DEFAULT_ZONE_COLOR
                # Assign blue if it's primarily a motorcycle zone (only motorcycle allowed)
                if 'motorcycle' in allowed_vehicles and 'car' not in allowed_vehicles and 'truck' not in allowed_vehicles:
                    zone_color = MOTORCYCLE_ZONE_COLOR
                # Assign orange if it allows cars or trucks (even if it also allows motorcycles)
                elif 'car' in allowed_vehicles or 'truck' in allowed_vehicles:
                    zone_color = CAR_TRUCK_ZONE_COLOR
                                
                lane_zones[z["id"]] = {
                    "name": z["name"],
                    "polygon": frame_coords,
                    "allowed_vehicles": allowed_vehicles, # Store the allowed vehicles from the name mapping
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
    print(f"🔴 Starting camera {camera_id}, original resolution: {original_width}x{original_height}, processing at {processing_width}x{processing_height}")

    # Use a dictionary to store violation status per track_id, including a flag if it's been recorded
    vehicle_violation_status = defaultdict(lambda: {"is_wrong_way": False, "recorded_wrong_way": False})
        
    # Buffer for 1 second of frames at 30 FPS (assuming typical stream FPS)
    # This buffer will now store frames at the ORIGINAL resolution
    frame_buffer = deque(maxlen=30) 
    fps = cap.get(cv2.CAP_PROP_FPS) or 30

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
            
            # Resize frame for AI processing
            resized_frame = cv2.resize(frame, (processing_width, processing_height))
            annotated_frame = resized_frame.copy() # This frame is 640x640 for drawing

            alpha = 0.4
            # Draw zones on the annotated frame (640x640)
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
                #    cx_zone, cy_zone = np.mean(zone_data["polygon"], axis=0).astype(int)
                #    put_text_with_background(annotated_frame, f"Zone {zone_data['name']}", (cx_zone, cy_zone), 0.5, (255, 255, 255))
                        
            # Traffic Sign Detection
            results_sign = model_sign(resized_frame, conf=0.1)
            boxes_sign = results_sign[0].boxes
                    
            # Variables for horizontal sign display
            sign_display_y_fixed = MARGIN # Fixed Y position for the row of signs (top of the frame)
            current_sign_x = processing_width - MARGIN # Start from the right edge, move left for each sign
            for i, box in enumerate(boxes_sign):
                cls_id = int(box.cls)
                label = model_sign.names[cls_id]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                x1, y1, x2, y2 = max(0, x1), max(0, y1), min(processing_width, x2), min(processing_height, y2)
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
                if x_thumb < MARGIN or (sign_display_y_fixed + OBJECT_SIZE + MARGIN + estimated_text_height) > processing_height:
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
                                        
                    # Reset violation flag for this frame for the current track_id
                    vehicle_violation_status[track_id]["is_wrong_way"] = False
                                        
                    label = f"ID:{track_id} {cls_name}"
                    bbox_color = (0, 255, 0) # Default to green (OK)
                                        
                    found_zone = False
                    for z_id, z_data in lane_zones.items():
                        if z_data["polygon"].size == 0: continue # Skip if polygon is empty
                        if cv2.pointPolygonTest(z_data["polygon"], (cx, cy), False) >= 0:
                            found_zone = True
                            # If the detected vehicle type is NOT allowed in this zone, it's a "wrong way" violation
                            if cls_name not in z_data["allowed_vehicles"]:
                                vehicle_violation_status[track_id]["is_wrong_way"] = True
                                bbox_color = (0, 0, 255) # Red for violation
                                label += f" - WRONG WAY ({z_data['name']})"
                                print(f"WRONG WAY VIOLATION (Zone): Vehicle {track_id} ({cls_name}) in zone {z_data['name']} (ID: {z_id}) - not allowed.")
                                
                                # Save violation to API (only if not already recorded for this track_id)
                                if not vehicle_violation_status[track_id]['recorded_wrong_way']:
                                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image, \
                                         tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                                        image_path = temp_image.name
                                        video_path = temp_video.name
                                        
                                        # Save image (current annotated frame, upscaled to original resolution)
                                        # Create the final output frame at original resolution for saving and streaming
                                        final_output_frame_for_save = cv2.resize(annotated_frame, (original_width, original_height))
                                        cv2.imwrite(image_path, final_output_frame_for_save)
                                        
                                        # Save video (1s before and after the current frame)
                                        # Ensure violation_frames are correctly captured from the buffer (which now stores original resolution frames)
                                        # The buffer should contain frames at original resolution
                                        violation_frames = list(frame_buffer)[-int(fps):] + [final_output_frame_for_save] + list(frame_buffer)[:int(fps)]
                                        save_temp_violation_video(violation_frames, fps, video_path, original_width, original_height)
                                        
                                        # Prepare violation data for API
                                        violation_data = {
                                            "camera": {"id": camera_id},
                                            "status": "PENDING",
                                            "createdAt": datetime.now().isoformat(),
                                            "violationDetails": [{
                                                "violationTypeId": 4,  # Assuming 4 is WRONG_LANE
                                                "violationTime": datetime.now().isoformat(),
                                                "licensePlate": f"TRACK_{track_id}"  # Placeholder
                                            }]
                                        }
                                        # Send violation asynchronously (non-blocking)
                                        print(f"📤 Sending WRONG_LANE violation for track {track_id} asynchronously...")
                                        send_violation_async(violation_data, image_path, video_path, track_id)
                                        
                                    vehicle_violation_status[track_id]['recorded_wrong_way'] = True
                            else:
                                # If vehicle is in a correct lane, reset the recorded flag
                                vehicle_violation_status[track_id]['recorded_wrong_way'] = False
                            break # Found the zone, no need to check others
                                
                    # If vehicle is not in any defined lane zone, reset wrong way flag
                    if not found_zone:
                        vehicle_violation_status[track_id]['recorded_wrong_way'] = False
                    
                    # Determine final label and color based on the single 'is_wrong_way' flag
                    if vehicle_violation_status[track_id]["is_wrong_way"]:
                        bbox_color = (0, 0, 255) # Red
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
            
            # Upscale the annotated frame to the original resolution for output
            final_output_frame = cv2.resize(annotated_frame, (original_width, original_height))
            
            # Store the final_output_frame (original resolution) in the buffer
            frame_buffer.append(final_output_frame.copy()) 

            # Encode and yield the annotated frame (now at original resolution)
            _, jpeg = cv2.imencode('.jpg', final_output_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
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
