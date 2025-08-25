import os
import cv2
import numpy as np
import json
import time
import traceback
from datetime import datetime
from collections import deque
from ultralytics import YOLO
import aiohttp
import asyncio
import requests
from concurrent.futures import ThreadPoolExecutor
import atexit
import tempfile
from utils.yt_stream import get_stream_url
from paddleocr import PaddleOCR

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
FRAME_RATE = 30  # FPS
ROI_SCALE = 1.5  # Scale vùng đầu
MIN_HEAD_SIZE = 20  # Kích thước tối thiểu vùng đầu (pixel)
RECONNECT_ATTEMPTS = 3
RECONNECT_DELAY = 1
VIOLATION_API_URL = "http://localhost:8081/api/violations"
VIOLATION_DELAY_FRAMES = int(0.7 * FRAME_RATE)  # Số frame tương ứng 0.7 giây (21 frames tại 30 FPS)

# Load the YOLO models
helmet_model = YOLO("besthl.pt")  # Model phát hiện mũ bảo hiểm
plate_model = YOLO("best90.pt")   # Model phát hiện biển số

# Initialize PaddleOCR reader
ocr_reader = PaddleOCR(use_angle_cls=True, lang='en')

# Define class names mapping for helmet model (removed LP class completely)
helmet_class_names = {
    0: "helmet",
    2: "no helmet"
    # Removed class 1 (LP) since we use plate_model for license plate detection
}

# Thread pool for async violation sending
violation_executor = ThreadPoolExecutor(max_workers=5)

def extract_license_plate_text(image, bbox):
    """
    Trích xuất text từ vùng biển số bằng PaddleOCR
    Xử lý biển số 2 dòng bằng cách ghép lại
    """
    try:
        x1, y1, x2, y2 = map(int, bbox)
        # Crop vùng biển số
        plate_crop = image[y1:y2, x1:x2]
        
        if plate_crop.size == 0:
            return "Unknown"
            
        # Resize để OCR dễ đọc hơn
        height, width = plate_crop.shape[:2]
        if height < 64:  # Tăng kích thước tối thiểu cho PaddleOCR
            scale = 64 / height
            new_width = int(width * scale)
            new_height = int(height * scale)
            plate_crop = cv2.resize(plate_crop, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Áp dụng preprocessing để cải thiện OCR
        if len(plate_crop.shape) == 3:
            gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = plate_crop
        
        # Tăng độ tương phản
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Gaussian blur nhẹ để giảm noise
        blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
        
        # Thử với ảnh gốc và ảnh đã xử lý
        for img_to_process in [plate_crop, blurred]:
            try:
                # PaddleOCR
                results = ocr_reader.ocr(img_to_process, cls=True)
                
                if results and results[0]:
                    # Tách các dòng text và sắp xếp theo tọa độ y
                    text_lines = []
                    for line in results[0]:
                        if len(line) >= 2 and line[1][1] > 0.6:  # Confidence threshold
                            bbox_coords = line[0]
                            text = line[1][0]
                            # Tính tọa độ y trung bình của text
                            avg_y = sum([point[1] for point in bbox_coords]) / len(bbox_coords)
                            text_lines.append((avg_y, text.strip()))
                    
                    if text_lines:
                        # Sắp xếp theo tọa độ y (từ trên xuống dưới)
                        text_lines.sort(key=lambda x: x[0])
                        
                        # Ghép các dòng lại với nhau
                        if len(text_lines) == 1:
                            # Biển số 1 dòng
                            final_text = text_lines[0][1]
                        else:
                            # Biển số nhiều dòng - ghép lại
                            final_text = ''.join([line[1] for line in text_lines])
                        
                        # Làm sạch text: chỉ giữ chữ cái, số và dấu gạch ngang
                        cleaned_text = ''.join(c for c in final_text if c.isalnum() or c == '-')
                        
                        if len(cleaned_text) >= 4:  # Biển số tối thiểu 4 ký tự
                            print(f"[+] OCR Success: Raw='{final_text}' -> Cleaned='{cleaned_text}'")
                            return cleaned_text
                            
            except Exception as ocr_error:
                print(f"[-] PaddleOCR processing error: {str(ocr_error)}")
                continue
        
        return "Unknown"
        
    except Exception as e:
        print(f"[-] OCR Error: {str(e)}")
        return "Unknown"

def find_closest_license_plate(rider_center, cached_plates, max_distance=200):
    """
    Tìm biển số gần nhất với người lái xe từ cache
    """
    if not cached_plates:
        return "Unknown", None
    
    min_distance = float('inf')
    closest_plate = "Unknown"
    closest_plate_bbox = None
    
    rider_x, rider_y = rider_center
    
    for plate_info in cached_plates.values():
        plate_x, plate_y = plate_info['center']
        distance = np.sqrt((rider_x - plate_x)**2 + (rider_y - plate_y)**2)
        
        if distance < min_distance and distance < max_distance:
            min_distance = distance
            closest_plate = plate_info['text']
            closest_plate_bbox = plate_info['bbox']
    
    return closest_plate, closest_plate_bbox

async def fetch_camera_config(cid: int, retries=3, delay=1):
    """
    Lấy cấu hình camera từ API Spring Boot
    """
    url = f"http://localhost:8081/api/cameras/{cid}"
    async with aiohttp.ClientSession() as session:
        for attempt in range(1, retries + 1):
            try:
                async with session.get(url, timeout=10) as response:
                    response.raise_for_status()
                    return await response.json()
            except Exception as e:
                print(f"[-] Retry {attempt}/{retries}: Error fetching camera config: {str(e)}")
                if attempt == retries:
                    raise RuntimeError(f"Failed to fetch camera config after {retries} retries: {e}")
                await asyncio.sleep(delay)

def save_temp_violation_video(frames, fps, output_path, width, height, violation_frame_idx):
    """
    Lưu video vi phạm từ danh sách frames, lấy 1 giây trước và 2 giây sau frame vi phạm
    """
    try:
        # Ensure we have enough frames and proper indices
        if len(frames) == 0:
            print(f"[-] No frames available for video creation")
            return False
            
        # Calculate frame indices: 1s before and 2s after
        frames_before = int(1 * fps)  # 1 second of frames before
        frames_after = int(2 * fps)   # 2 seconds of frames after
        
        # Fix violation_frame_idx to be relative to buffer
        buffer_violation_idx = min(violation_frame_idx, len(frames) - 1)
        start_idx = max(0, buffer_violation_idx - frames_before)
        end_idx = min(len(frames), buffer_violation_idx + frames_after + 1)
        
        print(f"[DEBUG] Video creation: buffer_size={len(frames)}, violation_idx={buffer_violation_idx}, range=[{start_idx}:{end_idx}]")

        out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
        if not out.isOpened():
            print(f"[-] Failed to open video writer for {output_path}")
            return False

        frames_written = 0
        for i in range(start_idx, end_idx):
            if i >= len(frames):
                break
                
            frame = frames[i]
            if frame is None:
                print(f"⚠️ Frame at index {i} is None, skipping...")
                continue
                
            # Validate frame dimensions and type
            if len(frame.shape) != 3 or frame.shape[2] != 3:
                print(f"⚠️ Invalid frame format at index {i}: shape={frame.shape}")
                continue
                
            frame_h, frame_w = frame.shape[:2]
            if frame_w != width or frame_h != height:
                print(f"⚠️ Frame dimension mismatch at index {i}: expected ({width}x{height}), got ({frame_w}x{frame_h})")
                # Resize frame to match expected dimensions
                frame = cv2.resize(frame, (width, height))
                
            out.write(frame)
            frames_written += 1

        out.release()
        
        # Verify the output file
        if frames_written > 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 1024:  # At least 1KB
            print(f"[+] Saved violation video: {output_path} ({frames_written} frames)")
            return True
        else:
            print(f"[-] Failed to save valid violation video: {output_path} (frames_written: {frames_written})")
            if os.path.exists(output_path):
                os.remove(output_path)
            return False
            
    except Exception as e:
        print(f"[-] Error saving violation video: {str(e)}")
        traceback.print_exc()
        return False

def send_violation_async(violation_data, image_path, video_path, track_id):
    """
    Gửi vi phạm đến API bất đồng bộ
    """
    def send_violation():
        try:
            # Verify files exist before sending
            if not os.path.exists(image_path) or not os.path.exists(video_path):
                print(f"❌ Missing files for track {track_id}: img={os.path.exists(image_path)}, vid={os.path.exists(video_path)}")
                return
                
            if os.path.getsize(image_path) == 0 or os.path.getsize(video_path) == 0:
                print(f"❌ Empty files for track {track_id}: img_size={os.path.getsize(image_path)}, vid_size={os.path.getsize(video_path)}")
                return
                
            with open(image_path, 'rb') as img_file, open(video_path, 'rb') as vid_file:
                files = {
                    'imageFile': ('violation.jpg', img_file, 'image/jpeg'),
                    'videoFile': ('violation.mp4', vid_file, 'video/mp4'),
                    'Violation': (None, json.dumps(violation_data), 'application/json')
                }
                response = requests.post(VIOLATION_API_URL, files=files, timeout=30)
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

async def stream_no_helmet_service(youtube_url: str, camera_id: int):
    """
    Stream video và phát hiện vi phạm không đội mũ bảo hiểm
    """
    print(f"[+] Starting stream_no_helmet_service for camera {camera_id}: {youtube_url}")
    print(f"[+] Loaded helmet model classes: {helmet_model.names}")
    print(f"[+] Loaded plate model classes: {plate_model.names}")
    print(f"[+] Using helmet classes: {helmet_class_names}")

    # Handle YouTube URL
    stream_url = youtube_url
    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        try:
            stream_url = get_stream_url(youtube_url)
            print(f"[+] Converted YouTube URL to stream: {stream_url}")
        except Exception as e:
            print(f"[-] Cannot convert YouTube URL: {str(e)}")
            raise ValueError(f"Cannot convert YouTube URL: {str(e)}")

    # Fetch camera config
    try:
        camera_config = await fetch_camera_config(camera_id)
        if not camera_config:
            print("[-] Failed to fetch camera config")
            raise ValueError("Could not fetch camera config")
    except Exception as e:
        print(f"[-] Failed to fetch camera config: {str(e)}")
        raise

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"[-] Cannot open stream: {stream_url}")
        raise ValueError(f"Cannot open stream: {stream_url}")

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[+] Video properties: {frame_width}x{frame_height} @ {fps} FPS")

    vehicle_violations = {}
    frame_buffer = deque(maxlen=int(fps * 4))  # Buffer for 4 seconds to ensure we have enough frames
    reconnect_attempts = 0
    max_reconnect_attempts = RECONNECT_ATTEMPTS * 2  # Hard limit for reconnection attempts
    last_valid_frame_time = time.time()
    stream_timeout = 30  # Timeout after 30 seconds of no valid frames

    license_plate_cache = {}  # {plate_id: {'text': str, 'center': tuple, 'bbox': tuple, 'last_seen': timestamp, 'confidence': float}}
    plate_ocr_interval = 30
    frame_count = 0
    violation_cooldown = {}  # {track_id: last_violation_time}
    VIOLATION_COOLDOWN_TIME = 10  # 10 seconds
    pending_violations = {}  # {track_id: {'detected_frame': int, 'license_plate': str, 'rider_center': tuple, 'rider_bbox': tuple, 'plate_bbox': tuple, 'class_name': str}}

    try:
        while True:
            ret, frame = cap.read()
            current_time = time.time()

            if not ret or frame is None or frame.size == 0:
                print(f"[-] Cannot read frame, retrying (attempt {reconnect_attempts + 1}/{max_reconnect_attempts})...")
                reconnect_attempts += 1

                # Check for stream timeout
                if current_time - last_valid_frame_time > stream_timeout:
                    print(f"[-] Stream timeout after {stream_timeout} seconds without valid frames")
                    raise RuntimeError(f"Stream timeout after {stream_timeout} seconds")

                # Attempt to reconnect
                cap.release()
                if reconnect_attempts >= max_reconnect_attempts:
                    raise RuntimeError(f"Max reconnect attempts reached: {max_reconnect_attempts}")
                time.sleep(RECONNECT_DELAY)
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    print(f"[-] Failed to reconnect to stream: {stream_url}")
                    continue
                continue

            # Reset reconnect attempts and update last valid frame time
            reconnect_attempts = 0
            last_valid_frame_time = current_time

            # Validate frame dimensions and format
            if len(frame.shape) != 3 or frame.shape[2] != 3:
                print(f"[-] Invalid frame format: shape={frame.shape}")
                continue
                
            frame_annotated = frame.copy()
            # Create a deep copy for buffer to avoid reference issues
            frame_for_buffer = frame.copy()
            h, w, _ = frame.shape
            frame_count += 1

            # Update frame dimensions if they changed
            if w != frame_width or h != frame_height:
                frame_width, frame_height = w, h
                print(f"[+] Updated frame dimensions: {frame_width}x{frame_height}")
                # Clear buffer when dimensions change to avoid issues
                frame_buffer.clear()

            # Add frame to buffer AFTER validation
            frame_buffer.append(frame_for_buffer)

            # Detect license plates
            current_plates = {}
            try:
                plate_results = plate_model(frame, conf=0.3, iou=0.4)
                if plate_results and len(plate_results) > 0 and plate_results[0].boxes is not None:
                    for idx, box in enumerate(plate_results[0].boxes):
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        confidence = float(box.conf[0])
                        center_x = (x1 + x2) // 2
                        center_y = (y1 + y2) // 2
                        plate_id = f"plate_{center_x//50}_{center_y//50}"

                        current_plates[plate_id] = {
                            'bbox': (x1, y1, x2, y2),
                            'center': (center_x, center_y),
                            'confidence': confidence,
                            'detected_this_frame': True
                        }

                        need_ocr = False
                        if plate_id not in license_plate_cache:
                            need_ocr = True
                        elif frame_count % plate_ocr_interval == 0:
                            if (confidence > license_plate_cache[plate_id].get('confidence', 0) or
                                    time.time() - license_plate_cache[plate_id].get('last_ocr', 0) > 5.0):
                                need_ocr = True

                        if need_ocr:
                            print(f"[+] Performing OCR for {plate_id} (confidence: {confidence:.2f})")
                            plate_text = extract_license_plate_text(frame, (x1, y1, x2, y2))
                            license_plate_cache[plate_id] = {
                                'text': plate_text,
                                'center': (center_x, center_y),
                                'bbox': (x1, y1, x2, y2),
                                'confidence': confidence,
                                'last_seen': time.time(),
                                'last_ocr': time.time()
                            }
                            print(f"[+] OCR Result for {plate_id}: {plate_text}")
                        else:
                            if plate_id in license_plate_cache:
                                license_plate_cache[plate_id]['center'] = (center_x, center_y)
                                license_plate_cache[plate_id]['bbox'] = (x1, y1, x2, y2)
                                license_plate_cache[plate_id]['last_seen'] = time.time()
                                if confidence > license_plate_cache[plate_id]['confidence']:
                                    license_plate_cache[plate_id]['confidence'] = confidence

                        plate_text = license_plate_cache.get(plate_id, {}).get('text', 'Detecting...')
                        cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), (255, 255, 0), 2)
                        cv2.putText(frame_annotated, f"LP: {plate_text}", (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            except Exception as e:
                print(f"[-] License plate detection error: {str(e)}")
                # Just log the error and continue with helmet detection

            # Clean up license plate cache
            current_time = time.time()
            plates_to_remove = [pid for pid, pinfo in license_plate_cache.items()
                                if current_time - pinfo['last_seen'] > 10.0]
            for plate_id in plates_to_remove:
                print(f"[+] Removing expired plate from cache: {plate_id}")
                del license_plate_cache[plate_id]

            # Initialize variables before helmet tracking
            active_track_ids = set()
            rider_boxes = []
            
            # YOLO helmet tracking
            try:
                helmet_results = helmet_model.track(source=frame, persist=True, conf=0.4, iou=0.4, tracker="bytetrack.yaml")[0]
            except Exception as e:
                print(f"[-] YOLO helmet tracking error: {str(e)}")
                # Continue with frame encoding even if detection failed
                helmet_results = None

            # Handle case when no helmet detection results
            if helmet_results is None or helmet_results.boxes is None or helmet_results.boxes.id is None:
                print(f"[DEBUG] No valid helmet detection results")
            else:
                # Process helmet detection results

                for i in range(len(helmet_results.boxes)):
                    cls_id = int(helmet_results.boxes.cls[i])
                    if cls_id not in helmet_class_names:
                        print(f"[DEBUG] Skipping unknown class ID: {cls_id}")
                        continue

                    class_name = helmet_class_names[cls_id]
                    if class_name in ["helmet", "no helmet"]:
                        x1, y1, x2, y2 = map(int, helmet_results.boxes.xyxy[i])
                        track_id = int(helmet_results.boxes.id[i])
                        active_track_ids.add(track_id)
                        rider_boxes.append((x1, y1, x2, y2, track_id, class_name))

            # Process pending violations (moved outside the else block)
            violations_to_process = []
            for track_id, violation_info in list(pending_violations.items()):
                frames_elapsed = frame_count - violation_info['detected_frame']
                if frames_elapsed >= VIOLATION_DELAY_FRAMES:
                    violations_to_process.append((track_id, violation_info))
                    del pending_violations[track_id]

            for track_id, violation_info in violations_to_process:
                license_plate_text = violation_info['license_plate']
                rider_bbox = violation_info['rider_bbox']
                plate_bbox = violation_info['plate_bbox']
                class_name = violation_info['class_name']
                violation_frame_idx = violation_info['detected_frame']

                # Use the current frame buffer for creating violation video
                if len(frame_buffer) > 0:
                    # Get a reference frame for the violation image (use the most recent frame)
                    violation_frame = list(frame_buffer)[-1].copy()  # Use the latest frame

                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image, \
                            tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                        image_path = temp_image.name
                        video_path = temp_video.name

                        # Save violation image
                        cv2.imwrite(image_path, violation_frame)

                        # Create violation video from current buffer
                        violation_frames = list(frame_buffer)
                        # Use relative index within the buffer
                        buffer_violation_idx = max(0, len(violation_frames) - 1)  # Use recent frames
                        
                        save_success = save_temp_violation_video(
                            violation_frames, fps, video_path, 
                            frame_width, frame_height, buffer_violation_idx
                        )
                        
                        if save_success:
                            violation_data = {
                                "camera": {"id": camera_id},
                                "status": "PENDING",
                                "vehicle": {"id": 26},
                                "createdAt": datetime.now().isoformat(),
                                "violationDetails": [{
                                    "violationTypeId": 5,
                                    "violationTime": datetime.now().isoformat(),
                                    "licensePlate": license_plate_text
                                }]
                            }
                            print(f"📤 Sending NO_HELMET violation for track {track_id} asynchronously...")
                            send_violation_async(violation_data, image_path, video_path, track_id)
                        else:
                            try:
                                if os.path.exists(image_path):
                                    os.remove(image_path)
                                if os.path.exists(video_path):
                                    os.remove(video_path)
                            except Exception as cleanup_error:
                                print(f"[-] Error cleaning up files after video save failure: {cleanup_error}")

            # Process each rider (only if we have valid helmet results)
            if helmet_results is not None and helmet_results.boxes is not None:
                for x1, y1, x2, y2, track_id, class_name in rider_boxes:
                    rider_center_x = (x1 + x2) // 2
                    rider_center_y = (y1 + y2) // 2

                    head_height = int((y2 - y1) / 3 * ROI_SCALE)
                    head_width = int((x2 - x1) * ROI_SCALE)
                    head_x1 = max(0, int(x1 - (head_width - (x2 - x1)) / 2))
                    head_y1 = max(0, y1)
                    head_x2 = min(w, head_x1 + head_width)
                    head_y2 = min(h, head_y1 + head_height)

                    no_helmet = False
                    if head_x2 > head_x1 and head_y2 > head_y1 and (head_x2 - head_x1) >= MIN_HEAD_SIZE and (head_y2 - head_y1) >= MIN_HEAD_SIZE:
                        for box in helmet_results.boxes:
                            cls_id = int(box.cls)
                            if cls_id not in helmet_class_names:
                                continue
                            box_class_name = helmet_class_names[cls_id]
                            if box_class_name in ["helmet", "no helmet"]:
                                hx1, hy1, hx2, hy2 = map(int, box.xyxy[0])
                                hcx, hcy = (hx1 + hx2) / 2, (hy1 + hy2) / 2
                                if (abs(hcx - ((x1 + x2) / 2)) < head_width / 1.5 and
                                        abs(hcy - ((y1 + y2) / 2)) < head_height / 1.5):
                                    if box_class_name == "no helmet":
                                        no_helmet = True
                                    break

                    license_plate_text, plate_bbox = find_closest_license_plate((rider_center_x, rider_center_y), license_plate_cache)

                    if no_helmet:
                        current_time = time.time()
                        can_send_violation = True
                        if track_id in violation_cooldown:
                            if current_time - violation_cooldown[track_id] < VIOLATION_COOLDOWN_TIME:
                                can_send_violation = False

                        if can_send_violation:
                            print(f"🚨 NO HELMET VIOLATION: Rider {track_id}, Plate: {license_plate_text} at ({rider_center_x}, {rider_center_y})")
                            violation_cooldown[track_id] = current_time
                            pending_violations[track_id] = {
                                'detected_frame': frame_count,
                                'license_plate': license_plate_text,
                                'rider_center': (rider_center_x, rider_center_y),
                                'rider_bbox': (x1, y1, x2, y2),
                                'plate_bbox': plate_bbox,
                                'class_name': class_name
                            }

                    color = (0, 0, 255) if no_helmet else (0, 255, 0)
                    violation_status = "VIOLATION" if no_helmet else "OK"
                    label = f"ID:{track_id} {class_name} {violation_status}"

                    cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame_annotated, label, (x1, y1 - 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    plate_label = f"Plate: {license_plate_text}"
                    cv2.putText(frame_annotated, plate_label, (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                    if head_x2 > head_x1 and head_y2 > head_y1:
                        cv2.rectangle(frame_annotated, (head_x1, head_y1), (head_x2, head_y2), color, 1)

            # Clean up old data (moved outside the else block)
            for track_id in list(vehicle_violations.keys()):
                if track_id not in active_track_ids and time.time() - vehicle_violations[track_id]["last_seen"] > 60:
                    vehicle_violations.pop(track_id, None)

            current_time = time.time()
            cooldowns_to_remove = [tid for tid, last_time in violation_cooldown.items()
                                  if current_time - last_time > VIOLATION_COOLDOWN_TIME * 2]
            for tid in cooldowns_to_remove:
                del violation_cooldown[tid]

            # Only clean pending violations for inactive tracks if we have valid detection results
            if helmet_results is not None:
                for track_id in list(pending_violations.keys()):
                    if track_id not in active_track_ids:
                        del pending_violations[track_id]

            # Display cache info
            cache_info = f"Cached Plates: {len(license_plate_cache)} | Frame: {frame_count} | Active: {len(active_track_ids)}"
            cv2.putText(frame_annotated, cache_info, (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # Ensure frame encoding always happens - this is the ONLY place we yield frames
            try:
                ret_encode, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret_encode and jpeg is not None and len(jpeg) > 0:
                    yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
                else:
                    print(f"[-] Failed to encode frame {frame_count} to JPEG")
                    # Try encoding original frame as fallback
                    ret_fallback, jpeg_fallback = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                    if ret_fallback and jpeg_fallback is not None:
                        yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg_fallback.tobytes() + b"\r\n")
                    else:
                        print(f"[-] Complete encoding failure for frame {frame_count}")
                        # Create a simple error frame
                        error_frame = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
                        cv2.putText(error_frame, f"Encoding Error - Frame {frame_count}", 
                                   (50, frame_height//2), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                        ret_error, jpeg_error = cv2.imencode(".jpg", error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                        if ret_error and jpeg_error is not None:
                            yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg_error.tobytes() + b"\r\n")
                            
            except Exception as encode_error:
                print(f"[-] Critical frame encoding error at frame {frame_count}: {str(encode_error)}")
                # This is a critical error that might indicate system issues
                # Don't continue indefinitely, but give it a few more tries
                encode_error_count = getattr(encode_error, 'count', 0) + 1
                if encode_error_count > 5:
                    print(f"[-] Too many encoding errors ({encode_error_count}), stopping stream")
                    break
                encode_error.count = encode_error_count

    except Exception as e:
        print(f"[-] Error in stream_no_helmet_service: {str(e)}")
        traceback.print_exc()
        raise
    finally:
        cap.release()
        print(f"[+] Closed stream for camera {camera_id}")

def cleanup_on_exit():
    """
    Dọn dẹp thread pool khi thoát
    """
    print("🛑 Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("✅ Violation executor shutdown complete")

# Đăng ký hàm cleanup
atexit.register(cleanup_on_exit)