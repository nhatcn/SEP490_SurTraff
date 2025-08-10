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

def send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id):
    """
    Gửi dữ liệu vi phạm đến API bất đồng bộ và xóa file ngay sau khi gửi
    """
    def send_violation():
        try:
            with open(snapshot_filepath, 'rb') as img_file, open(video_filepath, 'rb') as vid_file:
                files = {
                    'imageFile': (os.path.basename(snapshot_filepath), img_file, 'image/jpeg'),
                    'videoFile': (os.path.basename(video_filepath), vid_file, 'video/mp4'),
                    'Violation': (None, json.dumps(violation_data), 'application/json')
                }
                response = requests.post(VIOLATION_API_URL, files=files, timeout=10)
                response.raise_for_status()
                print(f"[+] Violation sent successfully for track {track_id}: {response.status_code}")
        except Exception as e:
            print(f"[-] Failed to send violation to API for track {track_id}: {e}")
        finally:
            # Xóa file ngay sau khi gửi, bất kể thành công hay thất bại
            for filepath in [snapshot_filepath, video_filepath]:
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        print(f"[+] Deleted file: {filepath}")
                except Exception as e:
                    print(f"[-] Failed to delete file {filepath}: {e}")

    violation_executor.submit(send_violation)

def stream_no_helmet_service(youtube_url: str, camera_id: int):
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
        camera_config = asyncio.run(fetch_camera_config(camera_id))
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

    vehicle_violations = {}
    frame_buffer = deque(maxlen=30)  # Buffer 30 khung hình
    recording_tasks = {}
    reconnect_attempts = 0
    
    # Cache để lưu trữ biển số đã OCR
    license_plate_cache = {}  # {plate_id: {'text': str, 'center': tuple, 'bbox': tuple, 'last_seen': timestamp, 'confidence': float}}
    plate_ocr_interval = 30  # OCR biển số mỗi 30 frames (1 giây với 30fps)
    frame_count = 0

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
            frame_for_video = frame.copy()
            h, w, _ = frame.shape
            frame_count += 1

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
                frame_buffer.append(frame_for_video.copy())
                ret, jpeg = cv2.imencode(".jpg", frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret and jpeg is not None:
                    yield (b"--frame\r\n" + b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
                continue

            if helmet_results.boxes is None or helmet_results.boxes.id is None:
                frame_buffer.append(frame_for_video.copy())
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

                # Just log the detection for testing
                if no_helmet:
                    print(f"[TEST] NO HELMET DETECTED: Rider {track_id}, Plate: {license_plate_text} at ({rider_center_x}, {rider_center_y})")

                color = (0, 0, 255) if no_helmet else (0, 255, 0)  # Red for no helmet, Green for helmet
                label = f"ID:{track_id} {class_name} Plate: {license_plate_text} {'NO HELMET' if no_helmet else 'OK'}"
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                if head_x2 > head_x1 and head_y2 > head_y1:
                    cv2.rectangle(frame_annotated, (head_x1, head_y1), (head_x2, head_y2), color, 1)

            frame_buffer.append(frame_for_video.copy())

            # Clean up old violations
            for track_id in list(vehicle_violations.keys()):
                if track_id not in active_track_ids and time.time() - vehicle_violations[track_id]["last_seen"] > 60:
                    vehicle_violations.pop(track_id, None)

            # Hiển thị thông tin cache trên frame
            cache_info = f"Cached Plates: {len(license_plate_cache)} | Frame: {frame_count}"
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
            task["writer"].release()
        print(f"[+] Closed stream for camera {camera_id}")

def cleanup_on_exit():
    """
    Dọn dẹp thread pool khi thoát
    """
    print("[+] Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("[+] Violation executor shutdown complete")

# Đăng ký hàm cleanup
atexit.register(cleanup_on_exit)