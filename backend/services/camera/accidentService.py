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
import shutil
import threading
from queue import Queue, Empty
from utils.yt_stream import get_stream_url
# Cấu hình
FPS = 30
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

def save_temp_accident_video(frames, fps, output_path, width, height):
    """Lưu video tai nạn với codec H.264"""
    try:
        fourcc = cv2.VideoWriter_fourcc(*'H264')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            print(f"❌ Failed to open VideoWriter for {output_path}")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frames_written = 0
        for frame in frames:
            if frame is not None and frame.shape[:2] == (height, width):
                out.write(frame)
                frames_written += 1
            else:
                print(f"⚠️ Skipping invalid frame: shape={frame.shape if frame is not None else None}")
        
        out.release()
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            print(f"✅ Video saved successfully: {output_path} ({frames_written} frames, {os.path.getsize(output_path)} bytes)")
            return True
        else:
            print(f"❌ Video file not created or empty: {output_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error saving video {output_path}: {e}")
        traceback.print_exc()
        return False

def handle_accident_event_async(recorded_frames, annotated_frame, camera_id, event_id):
    """Xử lý accident event trong thread riêng để không block stream"""
    try:
        if len(recorded_frames) == 0:
            print("Không thể ghi khung hình sau khi phát hiện.")
            return

        # Lấy thông tin location từ API camera
        location, camera_name = get_camera_location(camera_id)

        # Lưu ảnh và video vào file tạm
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_image, \
             tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            image_path = temp_image.name
            video_path = temp_video.name

            # Lưu ảnh
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]
            cv2.imwrite(image_path, annotated_frame, encode_params)

            # Lưu video
            height, width = annotated_frame.shape[:2]
            if save_temp_accident_video(recorded_frames, FPS, video_path, width, height):
                # Tạo debug copy của video
                debug_video_path = os.path.join("accidents", f"accident_{event_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4")
                os.makedirs("accidents", exist_ok=True)
                if os.path.exists(video_path):
                    shutil.copy2(video_path, debug_video_path)
                    print(f"📋 Debug video saved: {debug_video_path} (Size: {os.path.getsize(debug_video_path)} bytes)")

                    # Xác minh video
                    cap = cv2.VideoCapture(debug_video_path)
                    if cap.isOpened():
                        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                        fps = cap.get(cv2.CAP_PROP_FPS)
                        v_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        v_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        duration = frame_count / fps if fps > 0 else 0
                        print(f"🎥 Video properties - Frames: {frame_count}, FPS: {fps:.2f}, "
                              f"Size: {v_width}x{v_height}, Duration: {duration:.2f}s")
                        cap.release()
                    else:
                        print(f"❌ Cannot open debug video for verification")

                # Chuẩn bị dữ liệu gửi API
                accident_dto = {
                    "cameraId": camera_id,
                    "vehicleId": 1,
                    "description": f"Accident detected at {camera_name}",
                    "location": location,
                    "accidentTime": datetime.now().isoformat()
                }

                # Gửi API
                with open(image_path, 'rb') as img_file, open(video_path, 'rb') as vid_file:
                    files = {
                        'accident': (None, json.dumps(accident_dto), 'application/json'),
                        'imageFile': ('accident_frame.jpg', img_file, 'image/jpeg'),
                        'videoFile': ('accident_clip.mp4', vid_file, 'video/mp4')
                    }
                    
                    print(f"📤 Sending accident to API... Event ID: {event_id}")
                    print(f"   Image size: {os.path.getsize(image_path)} bytes")
                    print(f"   Video size: {os.path.getsize(video_path)} bytes")
                    
                    accident_api_url = "http://localhost:8081/api/accident/add"
                    response = requests.post(accident_api_url, files=files, timeout=30)
                    response.raise_for_status()
                    print(f"✅ Accident sent successfully for event {event_id}: {response.status_code}")
                    try:
                        response_data = response.json()
                        print(f"📥 API Response: {json.dumps(response_data, indent=2)}")
                    except:
                        print(f"📥 API Response (text): {response.text}")
            else:
                print(f"❌ Failed to create accident video for event {event_id}, only sending image")
                with open(image_path, 'rb') as img_file:
                    files = {
                        'accident': (None, json.dumps(accident_dto), 'application/json'),
                        'imageFile': ('accident_frame.jpg', img_file, 'image/jpeg')
                    }
                    accident_api_url = "http://localhost:8081/api/accident/add"
                    response = requests.post(accident_api_url, files=files, timeout=30)
                    response.raise_for_status()
                    print(f"✅ Accident (image only) sent successfully for event {event_id}: {response.status_code}")

    except Exception as e:
        print(f"❌ Lỗi khi xử lý sự kiện trong thread: {e}")
        traceback.print_exc()
    finally:
        # Dọn dẹp file tạm
        try:
            if os.path.exists(image_path):
                os.remove(image_path)
            if os.path.exists(video_path):
                os.remove(video_path)
            print(f"🗑️ Cleaned up temp files for event {event_id}")
            print(f"🔍 Debug video kept at: {debug_video_path}")
        except Exception as e:
            print(f"⚠️ Error deleting temp files for event {event_id}: {e}")

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

            # Chạy detection mọi frame như bản gốc
            results = model_accident(frame)[0]
            
            if len(results.boxes) > 0:
                print(f"Detected {len(results.boxes)} objects")

            for box in results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = model_accident.names[cls_id]
                
                print(f"Detection: {class_name} - confidence: {conf:.3f}")

                if conf < 0.5:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 0, 255) if "accident" in class_name.lower() else (0, 255, 0)
                label = f"{class_name} {conf:.2f}"
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                accident_keywords = ["accident"]
                if any(keyword in class_name.lower() for keyword in accident_keywords):
                    accident_detected_in_frame = True
                    print(f"ACCIDENT DETECTED! Class: {class_name}, Confidence: {conf:.3f}")

            # Xử lý event detection
            if accident_detected_in_frame:
                if active_event_id is None or (current_time - last_event_detection_time) > EVENT_ACTIVE_DURATION_SECONDS:
                    active_event_id = str(uuid.uuid4())
                    last_event_detection_time = current_time
                    print(f"New accident event detected: {active_event_id}")

                    try:
                        print("Bắt đầu ghi video 3s sau khi phát hiện tai nạn...")
                        recorded_frames = []
                        record_start_time = time.time()

                        for i in range(FPS * VIDEO_CLIP_DURATION_SECONDS):
                            ret, f = cap.read()
                            if not ret:
                                break
                            recorded_frames.append(f.copy())
                            
                            if time.time() - record_start_time > VIDEO_CLIP_DURATION_SECONDS + 1:
                                break

                        # Xử lý API trong thread riêng
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

            # Stream real-time frame
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85]
            _, jpeg = cv2.imencode('.jpg', annotated_frame, encode_params)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()
        print("Stream processing stopped and camera released.")