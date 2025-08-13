import os
import cv2
import time
import traceback
import json
import tempfile
import uuid
import requests
import numpy as np
from datetime import datetime
from ultralytics import YOLO
import imageio.v2 as imageio
from utils.yt_stream import get_stream_url
import threading
from queue import Queue, Empty

# Cấu hình
FPS = 25
VIDEO_CLIP_DURATION_SECONDS = 3
EVENT_ACTIVE_DURATION_SECONDS = 4

# Global variables để cache model và tối ưu
_model_cache = {}
_model_lock = threading.Lock()

def get_cached_model():
    """Lấy model từ cache hoặc tạo mới nếu chưa có"""
    global _model_cache
    
    with _model_lock:
        if 'accident' not in _model_cache:
            print("Loading YOLO accident model...")
            _model_cache['accident'] = YOLO("accident.pt")
            # Warm up model
            dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
            _ = _model_cache['accident'](dummy_frame)
            
            # In ra tất cả class names trong model
            print(f"Model loaded! Available classes: {_model_cache['accident'].names}")
            print("Model loaded and cached!")
        return _model_cache['accident']

def optimize_video_capture(cap):
    """Tối ưu video capture settings"""
    try:
        # Giảm buffer size để giảm latency
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        # Tối ưu FPS
        cap.set(cv2.CAP_PROP_FPS, FPS)
        # Giảm kích thước nếu cần
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    except:
        pass  # Ignore nếu không set được
    return cap

def get_camera_location(camera_id):
    """Lấy thông tin location từ API camera"""
    try:
        camera_api_url = f"http://localhost:8000/api/cameras/{camera_id}"
        response = requests.get(camera_api_url, timeout=5)
        response.raise_for_status()
        camera_data = response.json()
        
        location = camera_data.get('location', 'Unknown Location')
        camera_name = camera_data.get('name', f'Camera {camera_id}')
        
        print(f"Đã lấy thông tin camera: {camera_name} - Location: {location}")
        return location, camera_name
        
    except Exception as e:
        print(f"Không thể lấy thông tin camera {camera_id}: {e}")
        return "Unknown Location", f"Camera {camera_id}"

def handle_accident_event_async(recorded_frames, annotated_frame, camera_id, event_id):
    """Xử lý accident event trong thread riêng để không block stream"""
    try:
        if len(recorded_frames) == 0:
            print("Không thể ghi khung hình sau khi phát hiện.")
            return

        # Lấy thông tin location từ API camera
        location, camera_name = get_camera_location(camera_id)

        # 1. Encode ảnh với chất lượng tối ưu
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]
        _, img_buffer = cv2.imencode('.jpg', annotated_frame, encode_params)
        image_file_bytes = img_buffer.tobytes()

        # 2. Encode video với settings tối ưu
        video_file_bytes = None
        try:
            fd, tmpfile_path = tempfile.mkstemp(suffix='.mp4')
            os.close(fd)
            print(f"Đang mã hóa video clip vào file tạm: {tmpfile_path} từ {len(recorded_frames)} khung hình...")

            # Sử dụng settings tối ưu cho encoding
            with imageio.get_writer(tmpfile_path, format='ffmpeg', mode='I', fps=FPS,
                                  codec='libx264', quality=7, macro_block_size=None) as writer:
                for f in recorded_frames:
                    # Resize frame để giảm kích thước file nếu cần
                    if f.shape[1] > 1280:
                        f = cv2.resize(f, (1280, 720))
                    rgb_frame = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
                    writer.append_data(rgb_frame)

            with open(tmpfile_path, 'rb') as f:
                video_file_bytes = f.read()
            print(f"Video clip đã được mã hóa thành công, kích thước: {len(video_file_bytes)} bytes")

            os.remove(tmpfile_path)
        except Exception as e:
            print(f"Lỗi khi mã hóa video vào file tạm: {e}")
            traceback.print_exc()

        # 3. Gửi API với timeout - sử dụng location từ API
        accident_dto = {
            "cameraId": camera_id,
            "vehicleId": 1,
            "description": f"Accident detected at {camera_name}",
            "location": location,  # ✅ Sử dụng location từ API
            "accidentTime": datetime.now().isoformat()
        }

        files = {
            'accident': (None, json.dumps(accident_dto), 'application/json'),
            'imageFile': ('accident_frame.jpg', image_file_bytes, 'image/jpeg')
        }
        if video_file_bytes:
            files['videoFile'] = ('accident_clip.mp4', video_file_bytes, 'video/mp4')
        else:
            print("Không thể tạo video clip, chỉ gửi ảnh.")

        accident_api_url = "http://localhost:8081/api/accident/add"
        response = requests.post(accident_api_url, files=files, timeout=30)
        response.raise_for_status()
        print(f"Tai nạn (Event ID: {event_id}) tại {location} đã được gửi tới API thành công lúc {datetime.now()}. Phản hồi: {response.json()}")

    except Exception as e:
        print(f"Lỗi khi xử lý sự kiện trong thread: {e}")
        traceback.print_exc()

def stream_accident_video_service(youtube_url: str, camera_id: int):
    """
    Service stream accident detection - Phiên bản tối ưu
    Giữ nguyên interface ban đầu nhưng cải thiện performance
    """
    # Lấy model từ cache
    model_accident = get_cached_model()
    
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    # Tối ưu video capture
    cap = optimize_video_capture(cap)

    active_event_id = None
    last_event_detection_time = None
    frame_count = 0
    # Loại bỏ detection interval để chạy mọi frame như bản gốc

    # Gửi frame đầu tiên ngay lập tức để giảm loading time
    ret, first_frame = cap.read()
    if ret:
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85]
        _, jpeg = cv2.imencode('.jpg', first_frame, encode_params)
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
        )

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Stream ended or error, attempting to reconnect...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    print("Failed to reconnect to stream. Exiting.")
                    break
                cap = optimize_video_capture(cap)
                continue

            frame_count += 1
            current_time = time.time()
            annotated_frame = frame.copy()
            accident_detected_in_frame = False

            # Chạy detection mọi frame như bản gốc để đảm bảo không miss detection
            results = model_accident(frame)[0]
            
            # Debug: In ra số lượng detections
            if len(results.boxes) > 0:
                print(f"Detected {len(results.boxes)} objects")

            for box in results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = model_accident.names[cls_id]
                
                # Debug: In ra thông tin detection
                print(f"Detection: {class_name} - confidence: {conf:.3f}")

                if conf < 0.5:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 0, 255) if "accident" in class_name.lower() else (0, 255, 0)
                label = f"{class_name} {conf:.2f}"
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                # Kiểm tra nhiều từ khóa accident khác nhau
                accident_keywords = ["accident"]
                if any(keyword in class_name.lower() for keyword in accident_keywords):
                    accident_detected_in_frame = True
                    print(f"ACCIDENT DETECTED! Class: {class_name}, Confidence: {conf:.3f}")
                
                # Nếu không tìm thấy từ khóa accident, có thể model của bạn dùng logic khác
                # Ví dụ: nhiều xe ở gần nhau = accident potential
                # Thêm logic tùy chỉnh ở đây nếu cần

            # Xử lý event detection
            if accident_detected_in_frame:
                if active_event_id is None or (current_time - last_event_detection_time) > EVENT_ACTIVE_DURATION_SECONDS:
                    active_event_id = str(uuid.uuid4())
                    last_event_detection_time = current_time
                    print(f"New accident event detected: {active_event_id}")

                    try:
                        # Ghi video trong main thread nhưng nhanh hơn
                        print("Bắt đầu ghi video 3s sau khi phát hiện tai nạn...")
                        recorded_frames = []
                        record_start_time = time.time()

                        for i in range(FPS * VIDEO_CLIP_DURATION_SECONDS):
                            ret, f = cap.read()
                            if not ret:
                                break
                            recorded_frames.append(f.copy())
                            
                            # Không sleep, chỉ đọc frame liên tục
                            if time.time() - record_start_time > VIDEO_CLIP_DURATION_SECONDS + 1:
                                break

                        # Xử lý API trong thread riêng để không block stream
                        threading.Thread(
                            target=handle_accident_event_async,
                            args=(recorded_frames, annotated_frame.copy(), camera_id, active_event_id),
                            daemon=True
                        ).start()

                    except Exception as e:
                        print(f"Lỗi khi xử lý sự kiện: {e}")
                        traceback.print_exc()
                else:
                    last_event_detection_time = current_time
            elif active_event_id is not None and (current_time - last_event_detection_time) > EVENT_ACTIVE_DURATION_SECONDS:
                print(f"Accident event {active_event_id} has expired due to no recent detections.")
                active_event_id = None
                last_event_detection_time = None

            # Stream real-time frame với encoding tối ưu
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85]
            _, jpeg = cv2.imencode('.jpg', annotated_frame, encode_params)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()
        print("Stream processing stopped and camera released.")