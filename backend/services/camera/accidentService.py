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
import imageio.v2 as imageio  # Dùng imageio v2 cho get_writer ổn định
from utils.yt_stream import get_stream_url

# Cấu hình
FPS = 25
VIDEO_CLIP_DURATION_SECONDS = 3
EVENT_ACTIVE_DURATION_SECONDS = 4

def stream_accident_video_service(youtube_url: str, camera_id: int):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    model_accident = YOLO("accident.pt")
    accident_api_url = "http://localhost:8081/api/accident/add"

    active_event_id = None
    last_event_detection_time = None

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
                continue

            results = model_accident(frame)[0]
            annotated_frame = frame.copy()
            accident_detected_in_frame = False

            for box in results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = model_accident.names[cls_id]

                if conf < 0.5:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 0, 255) if "accident" in class_name.lower() else (0, 255, 0)
                label = f"{class_name} {conf:.2f}"
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                if "accident" in class_name.lower():
                    accident_detected_in_frame = True

            current_time = time.time()

            if accident_detected_in_frame:
                if active_event_id is None or (current_time - last_event_detection_time) > EVENT_ACTIVE_DURATION_SECONDS:
                    active_event_id = str(uuid.uuid4())
                    last_event_detection_time = current_time
                    print(f"New accident event detected: {active_event_id}")

                    try:
                        # Bắt đầu ghi video từ thời điểm phát hiện tai nạn
                        print("Bắt đầu ghi video 3s sau khi phát hiện tai nạn...")
                        recorded_frames = []

                        for _ in range(FPS * VIDEO_CLIP_DURATION_SECONDS):
                            ret, f = cap.read()
                            if not ret:
                                break
                            recorded_frames.append(f)
                            time.sleep(1 / FPS)

                        if len(recorded_frames) == 0:
                            print("Không thể ghi khung hình sau khi phát hiện.")
                            continue

                        # 1. Encode ảnh
                        _, img_buffer = cv2.imencode('.jpg', annotated_frame)
                        image_file_bytes = img_buffer.tobytes()

                        # 2. Encode video
                        video_file_bytes = None
                        try:
                            fd, tmpfile_path = tempfile.mkstemp(suffix='.mp4')
                            os.close(fd)
                            print(f"Đang mã hóa video clip vào file tạm: {tmpfile_path} từ {len(recorded_frames)} khung hình...")

                            with imageio.get_writer(tmpfile_path, format='ffmpeg', mode='I', fps=FPS) as writer:
                                for f in recorded_frames:
                                    rgb_frame = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
                                    writer.append_data(rgb_frame)

                            with open(tmpfile_path, 'rb') as f:
                                video_file_bytes = f.read()
                            print(f"Video clip đã được mã hóa thành công, kích thước: {len(video_file_bytes)} bytes")

                            os.remove(tmpfile_path)
                        except Exception as e:
                            print(f"Lỗi khi mã hóa video vào file tạm: {e}")
                            traceback.print_exc()

                        # 3. Gửi API
                        accident_dto = {
                            "cameraId": camera_id,
                            "vehicleId": 1,
                            "description": "Accident",
                            "location": "LX",
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

                        response = requests.post(accident_api_url, files=files)
                        response.raise_for_status()
                        print(f"Tai nạn (Event ID: {active_event_id}) đã được gửi tới API thành công lúc {datetime.now()}. Phản hồi: {response.json()}")

                    except Exception as e:
                        print(f"Lỗi khi xử lý sự kiện: {e}")
                        traceback.print_exc()
                else:
                    last_event_detection_time = current_time
            elif active_event_id is not None and (current_time - last_event_detection_time) > EVENT_ACTIVE_DURATION_SECONDS:
                print(f"Accident event {active_event_id} has expired due to no recent detections.")
                active_event_id = None
                last_event_detection_time = None

            # Stream real-time frame (nếu bạn dùng Web UI)
            _, jpeg = cv2.imencode('.jpg', annotated_frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()
        print("Stream processing stopped and camera released.")
