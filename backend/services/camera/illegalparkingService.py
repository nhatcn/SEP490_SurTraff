import os
import cv2
import math
import time
import requests
import json
import numpy as np
from datetime import datetime
from collections import deque
from ultralytics import YOLO
from shapely.geometry import Point, Polygon
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate
from utils.yt_stream import get_stream_url
from crud import violation_crud  
import traceback
import tempfile
import ffmpeg
import threading
from concurrent.futures import ThreadPoolExecutor
import atexit

# Load models
model_vehicle = YOLO("yolov8m.pt")
model_light = YOLO("final.pt")  # Red light model

# Constants
stop_line_y = 550
iou_threshold = 200
red_light_buffer_size = 5
VIOLATION_API_URL = "http://localhost:8081/api/violations"

# Create violations directory
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)

# Thread pool for async violation sending
violation_executor = ThreadPoolExecutor(max_workers=5)

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

def cleanup_output_video(video_path):
    """Clean up output video file"""
    try:
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"🗑️ Deleted output video: {video_path}")
    except Exception as e:
        print(f"⚠️ Error deleting output video {video_path}: {e}")

def analyze_traffic_video(youtube_url: str, camera_id: int):
    def fetch_camera_config(cid: int, retries=3, delay=1):
        url = f"http://localhost:8081/api/cameras/{cid}"
        for attempt in range(retries):
            try:
                res = requests.get(url)
                res.raise_for_status()
                return res.json()
            except Exception as e:
                print(f"Retry {attempt+1}/{retries}: Error fetching zones: {e}")
                time.sleep(delay)
        raise ValueError("Failed to fetch camera config after retries")

    camera_config = fetch_camera_config(camera_id)
    if not camera_config:
        raise ValueError("Could not fetch camera config")

    zones = camera_config.get("zones", [])
    lane_movements = camera_config.get("laneMovements", [])
    light_lane_links = camera_config.get("zoneLightLaneLinks", [])

    def convert_percentage_to_frame(percentage_coords, frame_width, frame_height):
        converted_coords = []
        for x_percent, y_percent in percentage_coords:
            x_pixel = int(round((x_percent / 100.0) * frame_width))
            y_pixel = int(round((y_percent / 100.0) * frame_height))
            x_pixel = max(0, min(frame_width - 1, x_pixel))
            y_pixel = max(0, min(frame_height - 1, y_pixel))
            converted_coords.append([x_pixel, y_pixel])
        return np.array(converted_coords, dtype=np.int32)

    def save_temp_violation_video(frames, fps, output_path, width, height):
        out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
        for frame in frames:
            out.write(frame)
        out.release()

    # Parse zones
    lane_zones_percentage = {}
    light_zones_percentage = {}
    zone_lines_percentage = []

    for z in zones:
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
    
    # Debug API data
    print(f"lane_transitions: {lane_transitions}")
    print(f"light_control_map: {light_control_map}")
    print(f"lane_zones_percentage: {lane_zones_percentage}")
    print(f"light_zones_percentage: {light_zones_percentage}")
    print(f"zone_lines_percentage: {zone_lines_percentage}")

    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    # Initialize zones with actual frame size
    lane_zones = {}
    light_zones = {}
    zone_lines = []
    frame_size_initialized = False

    frame_buffer = deque(maxlen=30)  # Buffer for 1 second of frames at 30 FPS
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    duration_threshold_frames = int(fps * 8)  # 3 seconds
    
    track_zone_duration = {}
    frame_counter = 0
    violation_sent = set()  # Track which vehicles already had violations sent
    
    # Wrong direction detection
    lane_direction_vectors = {}  # Store reference direction for each lane
    track_position_history = {}  # Store position history for each vehicle
    track_direction_samples = {}  # Store direction samples for each vehicle
    min_samples_for_direction = 5  # Minimum samples to establish direction

    # Video output for debug
    out = None
    output_video_path = None

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_counter += 1
            frame_annotated = frame.copy()
            h, w, _ = frame.shape
            frame_buffer.append(frame_annotated.copy())

            # Initialize zones with frame size
            if not frame_size_initialized:
                print(f"Frame size: {w}x{h}")
                print(f"Converting percentage coordinates to frame coordinates...")
                
                for zone_id, zone_data in lane_zones_percentage.items():
                    frame_coords = convert_percentage_to_frame(zone_data["coordinates"], w, h)
                    lane_zones[zone_id] = {"name": zone_data["name"], "polygon": frame_coords}
                    print(f"Lane zone {zone_id} ({zone_data['name']}): {len(frame_coords)} points")

                for zone_id, zone_data in light_zones_percentage.items():
                    frame_coords = convert_percentage_to_frame(zone_data["coordinates"], w, h)
                    light_zones[zone_id] = {"name": zone_data["name"], "polygon": frame_coords}
                    print(f"Light zone {zone_id} ({zone_data['name']}): {len(frame_coords)} points")

                for line_data in zone_lines_percentage:
                    frame_coords = convert_percentage_to_frame(line_data["coordinates"], w, h)
                    zone_lines.append({"id": line_data["id"], "name": line_data["name"], "coordinates": frame_coords})
                    print(f"Line {line_data['id']} ({line_data['name']}): {len(frame_coords)} points")

                frame_size_initialized = True
                print(f"Initialized {len(lane_zones)} lane zones, {len(light_zones)} light zones, {len(zone_lines)} lines")

                # Create output video path
                output_video_path = os.path.join(VIOLATIONS_DIR, f"output_{camera_id}.mp4")
                out = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

            # Draw zones
            for zone_id, zone in lane_zones.items():
                cv2.polylines(frame_annotated, [zone["polygon"]], isClosed=True, color=(255, 255, 0), thickness=2)
                if len(zone["polygon"]) > 0:
                    cx, cy = np.mean(zone["polygon"], axis=0).astype(int)
                    cv2.putText(frame_annotated, f"Lane: {zone['name']}", (cx, cy), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            # Draw light zones
            for light_zone_id, light_zone in light_zones.items():
                cv2.polylines(frame_annotated, [light_zone["polygon"]], isClosed=True, color=(0, 0, 255), thickness=2)
                if len(light_zone["polygon"]) > 0:
                    lane_zone_id = next((k for k, v in light_control_map.items() if v == light_zone_id), None)
                    lane_zone_name = lane_zones[lane_zone_id]["name"] if lane_zone_id in lane_zones else "Unknown"
                    top_y = int(np.min(light_zone["polygon"][:, 1]))
                    cx = int(np.mean(light_zone["polygon"][:, 0]))
                    cv2.putText(frame_annotated, f"Light of Zone: {lane_zone_name}", 
                                (cx, top_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            # Draw lines
            for line in zone_lines:
                if len(line["coordinates"]) >= 2:
                    cv2.polylines(frame_annotated, [line["coordinates"]], isClosed=False, color=(0, 255, 255), thickness=3)
                    mid_point = line["coordinates"][len(line["coordinates"])//2]
                    cv2.putText(frame_annotated, f"Line: {line['name']}", tuple(mid_point), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

            # Detect and track vehicles
            results = model_vehicle.track(source=frame, persist=True, conf=0.25, iou=0.4, tracker="bytetrack.yaml")[0]

            if results.boxes is not None and results.boxes.id is not None:
                for i in range(len(results.boxes)):
                    cls_id = int(results.boxes.cls[i])
                    class_name = model_vehicle.names[cls_id]
                    if class_name not in ['car', 'truck', 'bus', 'motorbike', 'bicycle']:
                        continue

                    x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    track_id = int(results.boxes.id[i])

                    print(f"Vehicle {track_id}: cx={cx}, cy={cy}")

                    # Track vehicle position for direction detection
                    prev_position = track_position_history.get(track_id)
                    track_position_history[track_id] = (cx, cy)
                    
                    # Calculate direction vector if we have previous position
                    current_direction = None
                    if prev_position:
                        dx = cx - prev_position[0]
                        dy = cy - prev_position[1]
                        # Only consider significant movements (>5 pixels)
                        if abs(dx) > 5 or abs(dy) > 5:
                            # Normalize direction vector
                            magnitude = (dx**2 + dy**2)**0.5
                            if magnitude > 0:
                                current_direction = (dx/magnitude, dy/magnitude)
                                
                                # Store direction sample for this vehicle
                                if track_id not in track_direction_samples:
                                    track_direction_samples[track_id] = []
                                track_direction_samples[track_id].append(current_direction)
                                
                                # Keep only recent samples
                                if len(track_direction_samples[track_id]) > 10:
                                    track_direction_samples[track_id].pop(0)

                    # Check if vehicle is in violation zone (lane zones, light zones, or near lines)
                    in_violation_zone = False
                    zone_details = ""

                    # Check lane zones
                    current_lane_id = None
                    for zone_id, zone in lane_zones.items():
                        if cv2.pointPolygonTest(zone["polygon"], (cx, cy), False) >= 0:
                            in_violation_zone = True
                            zone_details = f"lane_zone_{zone_id}({zone['name']})"
                            current_lane_id = zone_id
                            break

                    # Check light zones if not already in violation zone
                    if not in_violation_zone:
                        for zone_id, zone in light_zones.items():
                            if cv2.pointPolygonTest(zone["polygon"], (cx, cy), False) >= 0:
                                in_violation_zone = True
                                zone_details = f"light_zone_{zone_id}({zone['name']})"
                                break

                    # Check if near lines if not already in violation zone
                    if not in_violation_zone:
                        for line in zone_lines:
                            coords = line["coordinates"]
                            if len(coords) >= 2:
                                line_start, line_end = tuple(coords[0]), tuple(coords[1])
                                # Calculate distance from point to line
                                try:
                                    distance = abs((line_end[1] - line_start[1]) * cx - (line_end[0] - line_start[0]) * cy + line_end[0] * line_start[1] - line_end[1] * line_start[0]) / (
                                        ((line_end[1] - line_start[1]) ** 2 + (line_end[0] - line_start[0]) ** 2) ** 0.5)
                                    if distance < 10:
                                        in_violation_zone = True
                                        zone_details = f"near_line_{line['id']}({line['name']})"
                                        break
                                except ZeroDivisionError:
                                    continue

                    print(f"Vehicle {track_id}: in_violation_zone={in_violation_zone}, zone_details={zone_details}")
                    
                    # Wrong direction detection for lane zones
                    if current_lane_id and current_direction and track_id not in violation_sent:
                        # Check if we have enough samples to determine direction
                        if (track_id in track_direction_samples and 
                            len(track_direction_samples[track_id]) >= min_samples_for_direction):
                            
                            # Calculate average direction for this vehicle
                            avg_dx = sum(d[0] for d in track_direction_samples[track_id]) / len(track_direction_samples[track_id])
                            avg_dy = sum(d[1] for d in track_direction_samples[track_id]) / len(track_direction_samples[track_id])
                            vehicle_direction = (avg_dx, avg_dy)
                            
                            print(f"Vehicle {track_id} direction: {vehicle_direction}")
                            
                            # Check if this lane has established direction
                            if current_lane_id not in lane_direction_vectors:
                                # First vehicle in this lane - establish reference direction
                                lane_direction_vectors[current_lane_id] = vehicle_direction
                                print(f"🎯 Lane {current_lane_id} direction established: {vehicle_direction}")
                            else:
                                # Compare with established lane direction
                                lane_direction = lane_direction_vectors[current_lane_id]
                                
                                # Calculate dot product to determine if same direction
                                dot_product = (vehicle_direction[0] * lane_direction[0] + 
                                             vehicle_direction[1] * lane_direction[1])
                                
                                print(f"Vehicle {track_id} vs Lane {current_lane_id}: dot_product={dot_product:.3f}")
                                
                                # If dot product < 0, directions are opposite (wrong way)
                                if dot_product < -0.3:  # Threshold for opposite direction
                                    print(f"🚨 WRONG DIRECTION VIOLATION: Vehicle {track_id} going opposite in lane {current_lane_id}")
                                    print(f"   Vehicle direction: {vehicle_direction}")
                                    print(f"   Lane direction: {lane_direction}")
                                    print(f"   Dot product: {dot_product}")
                                    
                                    # Create temporary files for violation
                                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image, \
                                         tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                                        image_path = temp_image.name
                                        video_path = temp_video.name

                                        # Save image
                                        cv2.imwrite(image_path, frame_annotated)

                                        # Save video (1s before and after)
                                        violation_frames = list(frame_buffer)[-15:] + [frame_annotated] + list(frame_buffer)[:15]
                                        save_temp_violation_video(violation_frames, fps, video_path, w, h)

                                        # Prepare violation data for API
                                        violation_data = {
                                            "camera": {"id": camera_id},
                                            "status": "PENDING",
                                            "createdAt": datetime.now().isoformat(),
                                            "violationDetails": [{
                                                "violationTypeId": 3,  # WRONG_DIRECTION (reusing ID 3)
                                                "violationTime": datetime.now().isoformat(),
                                                "licensePlate": f"TRACK_{track_id}",
                                                "description": f"Vehicle going wrong direction in {zone_details} (dot_product: {dot_product:.3f})"
                                            }]
                                        }

                                        # Send violation asynchronously (non-blocking)
                                        print(f"📤 Sending wrong direction violation for track {track_id} asynchronously...")
                                        send_violation_async(violation_data, image_path, video_path, track_id)
                                        
                                        # Mark as sent to avoid duplicate violations
                                        violation_sent.add(track_id)

                    # Handle prolonged presence detection
                    if in_violation_zone:
                        if track_id not in track_zone_duration:
                            track_zone_duration[track_id] = frame_counter
                            print(f"Vehicle {track_id} entered violation zone at frame {frame_counter} ({zone_details})")
                        else:
                            duration_frames = frame_counter - track_zone_duration[track_id]
                            if duration_frames >= duration_threshold_frames and track_id not in violation_sent:
                                duration_seconds = duration_frames / fps
                                print(f"🚨 PROLONGED PRESENCE VIOLATION: Vehicle {track_id} stayed in {zone_details} for {duration_frames} frames ({duration_seconds:.2f}s)")
                                
                                # Create temporary files for violation
                                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image, \
                                     tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                                    image_path = temp_image.name
                                    video_path = temp_video.name

                                    # Save image
                                    cv2.imwrite(image_path, frame_annotated)

                                    # Save video (1s before and after)
                                    violation_frames = list(frame_buffer)[-15:] + [frame_annotated] + list(frame_buffer)[:15]
                                    save_temp_violation_video(violation_frames, fps, video_path, w, h)

                                    # Prepare violation data for API
                                    violation_data = {
                                        "camera": {"id": camera_id},
                                        "status": "PENDING",
                                        "createdAt": datetime.now().isoformat(),
                                        "violationDetails": [{
                                            "violationTypeId": 3,  # PROLONGED_PRESENCE
                                            "violationTime": datetime.now().isoformat(),
                                            "licensePlate": f"TRACK_{track_id}",
                                            "description": f"Vehicle stayed in {zone_details} for {duration_seconds:.2f}s"
                                        }]
                                    }

                                    # Send violation asynchronously (non-blocking)
                                    print(f"📤 Sending prolonged presence violation for track {track_id} asynchronously...")
                                    send_violation_async(violation_data, image_path, video_path, track_id)
                                    
                                    # Mark as sent to avoid duplicate violations
                                    violation_sent.add(track_id)

                    else:
                        # Vehicle left violation zone, reset tracking
                        if track_id in track_zone_duration:
                            duration_frames = frame_counter - track_zone_duration[track_id]
                            duration_seconds = duration_frames / fps
                            print(f"Vehicle {track_id} left violation zone after {duration_frames} frames ({duration_seconds:.2f}s)")
                            del track_zone_duration[track_id]
                            # Remove from violation_sent if it was there (allow new violations)
                            violation_sent.discard(track_id)
                            
                        # Clean up direction tracking when vehicle leaves all zones
                        if not in_violation_zone:
                            if track_id in track_direction_samples:
                                del track_direction_samples[track_id]
                            if track_id in track_position_history:
                                del track_position_history[track_id]

                    # Draw bounding box and label
                    color = (0, 255, 0)  # Green for normal tracking
                    violation_text = "OK"
                    
                    # Check for wrong direction violation
                    if (current_lane_id and current_lane_id in lane_direction_vectors and 
                        track_id in track_direction_samples and 
                        len(track_direction_samples[track_id]) >= min_samples_for_direction):
                        
                        # Calculate current vehicle direction
                        avg_dx = sum(d[0] for d in track_direction_samples[track_id]) / len(track_direction_samples[track_id])
                        avg_dy = sum(d[1] for d in track_direction_samples[track_id]) / len(track_direction_samples[track_id])
                        vehicle_direction = (avg_dx, avg_dy)
                        
                        # Compare with lane direction
                        lane_direction = lane_direction_vectors[current_lane_id]
                        dot_product = (vehicle_direction[0] * lane_direction[0] + 
                                     vehicle_direction[1] * lane_direction[1])
                        
                        if dot_product < -0.3:  # Wrong direction
                            color = (128, 0, 128)  # Purple for wrong direction
                            violation_text = "WRONG_DIRECTION"
                    
                    # Check for prolonged presence
                    if track_id in track_zone_duration:
                        duration = frame_counter - track_zone_duration[track_id]
                        if duration >= duration_threshold_frames:
                            if violation_text == "OK":  # Don't override wrong direction
                                color = (0, 0, 255)  # Red for violation
                                violation_text = "PROLONGED_PRESENCE"
                        else:
                            if violation_text == "OK":  # Don't override wrong direction
                                color = (0, 255, 255)  # Yellow for warning
                                violation_text = "WARNING"
                    
                    label = f"ID:{track_id} {class_name} {violation_text}"
                    if track_id in track_zone_duration:
                        duration = frame_counter - track_zone_duration[track_id]
                        duration_seconds = duration / fps
                        label += f" T:{duration_seconds:.1f}s"
                    
                    # Add direction info if available
                    if (current_lane_id and current_lane_id in lane_direction_vectors and 
                        track_id in track_direction_samples and 
                        len(track_direction_samples[track_id]) >= min_samples_for_direction):
                        
                        avg_dx = sum(d[0] for d in track_direction_samples[track_id]) / len(track_direction_samples[track_id])
                        avg_dy = sum(d[1] for d in track_direction_samples[track_id]) / len(track_direction_samples[track_id])
                        dot_product = (avg_dx * lane_direction_vectors[current_lane_id][0] + 
                                     avg_dy * lane_direction_vectors[current_lane_id][1])
                        label += f" Dir:{dot_product:.2f}"
                    
                    cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame_annotated, label, (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                    if zone_details:
                        cv2.putText(frame_annotated, zone_details, (x1, y2 + 20), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
                    
                    # Display lane direction info
                    if current_lane_id and current_lane_id in lane_direction_vectors:
                        lane_dir = lane_direction_vectors[current_lane_id]
                        direction_text = f"Lane_dir:({lane_dir[0]:.2f},{lane_dir[1]:.2f})"
                        cv2.putText(frame_annotated, direction_text, (x1, y2 + 40), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)

                    print(f"Vehicle {track_id}: violation_sent={track_id in violation_sent}, violation_text={violation_text}")

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
        print(f"❌ Error in analyze_traffic_video: {e}")
        traceback.print_exc()
    finally:
        # Clean up resources
        cap.release()
        if out:
            out.release()
        
        # Clean up output video file
        if output_video_path:
            cleanup_output_video(output_video_path)
        
        print("🧹 Stream cleanup completed")


def extract_thumbnail_from_stream_url(youtube_url: str) -> bytes:
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

# Cleanup function for graceful shutdown
def cleanup_on_exit():
    """Clean up thread pool on exit"""
    print("🛑 Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("✅ Violation executor shutdown complete")

# Register cleanup function
atexit.register(cleanup_on_exit)

