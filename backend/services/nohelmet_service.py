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
        return "Unknown"
    
    min_distance = float('inf')
    closest_plate = "Unknown"
    
    rider_x, rider_y = rider_center
    
    for plate_info in cached_plates.values():
        plate_x, plate_y = plate_info['center']
        distance = np.sqrt((rider_x - plate_x)**2 + (rider_y - plate_y)**2)
        
        if distance < min_distance and distance < max_distance:
            min_distance = distance
            closest_plate = plate_info['text']
    
    return closest_plate

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

def save_temp_violation_video(frames, fps, output_path, width, height):
    """
    Lưu video vi phạm từ danh sách frames
    """
    try:
        out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
        for frame in frames:
            if frame is not None and frame.shape[1] == width and frame.shape[0] == height:
                out.write(frame)
        out.release()
        print(f"[+] Saved violation video: {output_path}")
        return True
    except Exception as e:
        print(f"[-] Error saving violation video: {str(e)}")
        return False

def send_violation_async(violation_data, image_path, video_path, track_id):
    """
    Gửi vi phạm đến API bất đồng bộ
    """
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
        cap.release()
        raise ValueError(f"Cannot open stream: {stream_url}")

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[+] Video properties: {frame_width}x{frame_height} @ {fps} FPS")

    vehicle_violations = {}
    frame_buffer = deque(maxlen=int(fps))  # Buffer 1 giây frames
    recording_tasks = {}
    reconnect_attempts = 0
    
    # Cache để lưu trữ biển số đã OCR
    license_plate_cache = {}  # {plate_id: {'text': str, 'center': tuple, 'bbox': tuple, 'last_seen': timestamp, 'confidence': float}}
    plate_ocr_interval = 30  # OCR biển số mỗi 30 frames (1 giây với 30fps)
    frame_count = 0

    # Cooldown để tránh gửi quá nhiều vi phạm cho cùng 1 track_id
    violation_cooldown = {}  # {track_id: last_violation_time}
    VIOLATION_COOLDOWN_TIME = 10  # 10 giây

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None or frame.size == 0:
                print(f"[-] Cannot read frame, retrying (attempt {reconnect_attempts + 1}/{RECONNECT_ATTEMPTS})...")
                cap.release()
                reconnect_attempts += 1
                if reconnect_attempts >= RECONNECT_ATTEMPTS:
                    raise RuntimeError(f"Max reconnect attempts reached: {RECONNECT_ATTEMPTS}")
                time.sleep(RECONNECT_DELAY)
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    print(f"[-] Failed to reconnect to stream: {stream_url}")
                    continue
                reconnect_attempts = 0
                continue

            frame_annotated = frame.copy()
            frame_for_buffer = frame.copy()  # Frame gốc cho buffer video
            h, w, _ = frame.shape
            frame_count += 1

            # Update frame dimensions if they changed
            if w != frame_width or h != frame_height:
                frame_width, frame_height = w, h
                print(f"[+] Updated frame dimensions: {frame_width}x{frame_height}")

            # Add frame to buffer
            frame_buffer.append(frame_for_buffer.copy())

            # Detect license plates - chỉ detect mỗi frame, OCR theo interval
            current_plates = {}
            try:
                plate_results = plate_model(frame, conf=0.3, iou=0.4)
                if plate_results and len(plate_results) > 0 and plate_results[0].boxes is not None:
                    for idx, box in enumerate(plate_results[0].boxes):
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        confidence = float(box.conf[0])
                        
                        # Tạo ID cho plate dựa trên vị trí (để track qua các frame)
                        center_x = (x1 + x2) // 2
                        center_y = (y1 + y2) // 2
                        plate_id = f"plate_{center_x//50}_{center_y//50}"  # Gom nhóm theo vùng 50x50 pixel
                        
                        current_plates[plate_id] = {
                            'bbox': (x1, y1, x2, y2),
                            'center': (center_x, center_y),
                            'confidence': confidence,
                            'detected_this_frame': True
                        }
                        
                        # Kiểm tra xem có cần OCR không
                        need_ocr = False
                        if plate_id not in license_plate_cache:
                            need_ocr = True
                        elif frame_count % plate_ocr_interval == 0:
                            # Chỉ OCR lại nếu confidence cao hơn hoặc đã lâu không OCR
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
                            # Cập nhật thông tin vị trí và thời gian nhìn thấy
                            if plate_id in license_plate_cache:
                                license_plate_cache[plate_id]['center'] = (center_x, center_y)
                                license_plate_cache[plate_id]['bbox'] = (x1, y1, x2, y2)
                                license_plate_cache[plate_id]['last_seen'] = time.time()
                                if confidence > license_plate_cache[plate_id]['confidence']:
                                    license_plate_cache[plate_id]['confidence'] = confidence
                        
                        # Vẽ biển số trên frame
                        plate_text = license_plate_cache.get(plate_id, {}).get('text', 'Detecting...')
                        cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), (255, 255, 0), 2)  # Cyan for plate
                        cv2.putText(frame_annotated, f"LP: {plate_text}", (x1, y1 - 10),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
                        
            except Exception as e:
                print(f"[-] License plate detection error: {str(e)}")

            # Dọn dẹp cache - xóa những biển số không nhìn thấy trong 10 giây
            current_time = time.time()
            plates_to_remove = []
            for plate_id, plate_info in license_plate_cache.items():
                if current_time - plate_info['last_seen'] > 10.0:
                    plates_to_remove.append(plate_id)
            
            for plate_id in plates_to_remove:
                print(f"[+] Removing expired plate from cache: {plate_id}")
                del license_plate_cache[plate_id]

            # YOLO helmet tracking
            try:
                helmet_results = helmet_model.track(source=frame, persist=True, conf=0.4, iou=0.4, tracker="bytetrack.yaml")[0]
            except Exception as e:
                print(f"[-] YOLO helmet tracking error: {str(e)}")
                ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret and jpeg is not None:
                    yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
                continue

            if helmet_results.boxes is None or helmet_results.boxes.id is None:
                ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret and jpeg is not None:
                    yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
                continue

            active_track_ids = set()
            rider_boxes = []

            for i in range(len(helmet_results.boxes)):
                cls_id = int(helmet_results.boxes.cls[i])
                
                # Only process classes that exist in our helmet_class_names mapping
                if cls_id not in helmet_class_names:
                    print(f"[DEBUG] Skipping unknown class ID: {cls_id}")
                    continue
                    
                class_name = helmet_class_names[cls_id]
                
                # Only process helmet and no helmet classes
                if class_name in ["helmet", "no helmet"]:
                    x1, y1, x2, y2 = map(int, helmet_results.boxes.xyxy[i])
                    track_id = int(helmet_results.boxes.id[i])
                    active_track_ids.add(track_id)
                    rider_boxes.append((x1, y1, x2, y2, track_id, class_name))

            # Process each rider
            for x1, y1, x2, y2, track_id, class_name in rider_boxes:
                # Calculate rider center for license plate matching
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
                        
                        # Only check classes that exist in our mapping
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

                # Find closest license plate for this rider from cache
                license_plate_text = find_closest_license_plate((rider_center_x, rider_center_y), license_plate_cache)

                # Check for NO HELMET violation
                if no_helmet:
                    # Check cooldown để tránh spam violations
                    current_time = time.time()
                    can_send_violation = True
                    
                    if track_id in violation_cooldown:
                        if current_time - violation_cooldown[track_id] < VIOLATION_COOLDOWN_TIME:
                            can_send_violation = False
                    
                    if can_send_violation:
                        print(f"🚨 NO HELMET VIOLATION: Rider {track_id}, Plate: {license_plate_text} at ({rider_center_x}, rider_center_y)")
                        
                        # Update cooldown
                        violation_cooldown[track_id] = current_time
                        
                        # Wait 0.7 seconds before capturing
                        await asyncio.sleep(0.7)
                        
                        # Capture new frame after delay
                        ret, delayed_frame = cap.read()
                        if not ret or delayed_frame is None or delayed_frame.size == 0:
                            print(f"[-] Failed to capture delayed frame for violation {track_id}")
                            continue
                        
                        # Annotate delayed frame with bounding boxes
                        delayed_frame_annotated = delayed_frame.copy()
                        
                        # Re-run detection on delayed frame to get updated bounding boxes
                        try:
                            delayed_helmet_results = helmet_model.track(source=delayed_frame, persist=True, conf=0.4, iou=0.4, tracker="bytetrack.yaml")[0]
                            delayed_plate_results = plate_model(delayed_frame, conf=0.3, iou=0.4)
                            
                            # Draw rider bounding box
                            for box in delayed_helmet_results.boxes:
                                if box.id is not None and int(box.id) == track_id:
                                    cls_id = int(box.cls)
                                    if cls_id in helmet_class_names and helmet_class_names[cls_id] in ["helmet", "no helmet"]:
                                        dx1, dy1, dx2, dy2 = map(int, box.xyxy[0])
                                        color = (0, 0, 255) if helmet_class_names[cls_id] == "no helmet" else (0, 255, 0)
                                        cv2.rectangle(delayed_frame_annotated, (dx1, dy1), (dx2, dy2), color, 2)
                                        label = f"ID:{track_id} {helmet_class_names[cls_id]} VIOLATION"
                                        cv2.putText(delayed_frame_annotated, label, (dx1, dy1 - 30),
                                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                                        # Draw head ROI
                                        d_head_height = int((dy2 - dy1) / 3 * ROI_SCALE)
                                        d_head_width = int((dx2 - dx1) * ROI_SCALE)
                                        d_head_x1 = max(0, int(dx1 - (d_head_width - (dx2 - dx1)) / 2))
                                        d_head_y1 = max(0, dy1)
                                        d_head_x2 = min(w, d_head_x1 + d_head_width)
                                        d_head_y2 = min(h, d_head_y1 + d_head_height)
                                        if d_head_x2 > d_head_x1 and d_head_y2 > d_head_y1:
                                            cv2.rectangle(delayed_frame_annotated, (d_head_x1, d_head_y1), (d_head_x2, d_head_y2), color, 1)
                                        # Draw license plate info
                                        plate_label = f"Plate: {license_plate_text}"
                                        cv2.putText(delayed_frame_annotated, plate_label, (dx1, dy1 - 10),
                                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                                        
                            # Draw license plate bounding boxes
                            if delayed_plate_results and len(delayed_plate_results) > 0 and delayed_plate_results[0].boxes is not None:
                                for box in delayed_plate_results[0].boxes:
                                    px1, py1, px2, py2 = map(int, box.xyxy[0])
                                    cv2.rectangle(delayed_frame_annotated, (px1, py1), (px2, py2), (255, 255, 0), 2)
                                    plate_text = license_plate_cache.get(f"plate_{(px1+px2)//100}_{(py1+py2)//100}", {}).get('text', 'Unknown')
                                    cv2.putText(delayed_frame_annotated, f"LP: {plate_text}", (px1, py1 - 10),
                                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
                        
                        except Exception as e:
                            print(f"[-] Error re-running detection on delayed frame: {str(e)}")
                            delayed_frame_annotated = delayed_frame  # Fallback to unannotated frame
                        
                        # Create temporary files for violation
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image, \
                             tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                            image_path = temp_image.name
                            video_path = temp_video.name

                            # Save delayed frame as image
                            cv2.imwrite(image_path, delayed_frame_annotated)

                            # Create violation video from buffer (1 second before and current frame)
                            violation_frames = list(frame_buffer) + [delayed_frame]
                            if len(violation_frames) > 0:
                                save_success = save_temp_violation_video(violation_frames, fps, video_path, frame_width, frame_height)
                                
                                if save_success:
                                    # Prepare violation data for API
                                    violation_data = {
                                        "camera": {"id": camera_id},
                                        "status": "PENDING",
                                        "createdAt": datetime.now().isoformat(),
                                        "violationDetails": [{
                                            "violationTypeId": 5,  
                                            "violationTime": datetime.now().isoformat(),
                                            "licensePlate": license_plate_text
                                        }]
                                    }

                                    # Send violation asynchronously (non-blocking)
                                    print(f"📤 Sending NO_HELMET violation for track {track_id} asynchronously...")
                                    send_violation_async(violation_data, image_path, video_path, track_id)
                                else:
                                    # Clean up files if video save failed
                                    try:
                                        if os.path.exists(image_path):
                                            os.remove(image_path)
                                        if os.path.exists(video_path):
                                            os.remove(video_path)
                                    except Exception as cleanup_error:
                                        print(f"[-] Error cleaning up files after video save failure: {cleanup_error}")

                color = (0, 0, 255) if no_helmet else (0, 255, 0)  # Red for no helmet, Green for helmet
                violation_status = "VIOLATION" if no_helmet else "OK"
                label = f"ID:{track_id} {class_name} {violation_status}"
                
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                            
                # Show license plate info
                plate_label = f"Plate: {license_plate_text}"
                cv2.putText(frame_annotated, plate_label, (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                           
                if head_x2 > head_x1 and head_y2 > head_y1:
                    cv2.rectangle(frame_annotated, (head_x1, head_y1), (head_x2, head_y2), color, 1)

            # Clean up old violations
            for track_id in list(vehicle_violations.keys()):
                if track_id not in active_track_ids and time.time() - vehicle_violations[track_id]["last_seen"] > 60:
                    vehicle_violations.pop(track_id, None)

            # Clean up old violation cooldowns
            current_time = time.time()
            cooldowns_to_remove = [tid for tid, last_time in violation_cooldown.items() 
                                 if current_time - last_time > VIOLATION_COOLDOWN_TIME * 2]
            for tid in cooldowns_to_remove:
                del violation_cooldown[tid]

            # Hiển thị thông tin cache trên frame
            cache_info = f"Cached Plates: {len(license_plate_cache)} | Frame: {frame_count} | Active: {len(active_track_ids)}"
            cv2.putText(frame_annotated, cache_info, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret and jpeg is not None:
                yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
            else:
                print(f"[-] Failed to encode frame to JPEG")

    except Exception as e:
        print(f"[-] Error in stream_no_helmet_service: {str(e)}")
        traceback.print_exc()
    finally:
        cap.release()
        for task in recording_tasks.values():
            if "writer" in task and task["writer"]:
                task["writer"].release()
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