import os
import cv2
import numpy as np
import json
import time
import traceback
from datetime import datetime
from collections import deque
from ultralytics import YOLO
import requests
import easyocr
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from filterpy.kalman import KalmanFilter
from utils.yt_stream import get_stream_url
from concurrent.futures import ThreadPoolExecutor
import atexit

# Constants
VIOLATIONS_DIR = "overspeed_violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
FRAME_RATE = 30  # FPS
STANDARD_WIDTH = 640
STANDARD_HEIGHT = 480
SPEED_LIMIT = 60  # km/h, adjust as needed
MIN_VEHICLE_SIZE = 50  # Minimum vehicle bounding box size (pixels)
DISTANCE_REF = 10  # Reference real-world distance (meters) for calibration
PIXEL_REF = 100  # Corresponding pixel distance for DISTANCE_REF
VIOLATION_API_URL = "http://localhost:8081/api/violations"

# Load YOLOv8m model
model = YOLO("yolov8m.pt")  # Pre-trained YOLOv8m model

# Define class names mapping
class_names = {
    2: "car",
    3: "motorbike",
    5: "bus",
    7: "truck",
    # Add number_plate if your model is fine-tuned to detect it
}

# Initialize EasyOCR
ocr_reader = easyocr.Reader(['en'], gpu=True)

# Initialize FastAPI
app = FastAPI()

# Thread pool for async violation sending
violation_executor = ThreadPoolExecutor(max_workers=5)

def fetch_camera_config(cid: int, retries=3, delay=1):
    """Fetch camera configuration from Spring Boot API."""
    url = f"http://localhost:8081/api/cameras/{cid}"
    for attempt in range(retries):
        try:
            res = requests.get(url)
            res.raise_for_status()
            config = res.json()
            return config
        except Exception as e:
            print(f"Retry {attempt+1}/{retries}: Error fetching camera config: {e}")
            time.sleep(delay)
    raise ValueError("Failed to fetch camera config after retries")

def extract_license_plate(roi):
    """Extract license plate text from a vehicle ROI using EasyOCR on lower part."""
    license_plate_text = "Unknown"
    if roi.size > 0:
        try:
            # Crop lower third for plate area
            h, w = roi.shape[:2]
            plate_roi = roi[int(2*h/3):h, :]
            plate_roi = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
            plate_roi = cv2.equalizeHist(plate_roi)
            ocr_results = ocr_reader.readtext(plate_roi, detail=0)
            if ocr_results:
                license_plate_text = ocr_results[0]
                license_plate_text = "".join(c for c in license_plate_text if c.isalnum()).upper()
        except Exception as e:
            print(f"Error in OCR: {e}")
            license_plate_text = "Unknown"
    return license_plate_text

def send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id):
    """Gửi dữ liệu vi phạm đến API bất đồng bộ và xóa file ngay sau khi gửi."""
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

def stream_overspeed_service(youtube_url: str, camera_id: int):
    """Stream video và phát hiện vi phạm quá tốc độ (nâng cấp chính xác)."""
    print(f"Loaded model classes: {model.names}")
    
    camera_config = fetch_camera_config(camera_id)
    if not camera_config:
        raise ValueError("Could not fetch camera config")

    # ===== Homography / Calibration =====
    H = None
    try:
        if "H" in camera_config and camera_config["H"]:
            H = np.array(camera_config["H"], dtype=np.float32)
        elif "src_points" in camera_config and "dst_points" in camera_config:
            src = np.array(camera_config["src_points"], dtype=np.float32)  # [(x,y),...]*4
            dst = np.array(camera_config["dst_points"], dtype=np.float32)  # [(X,Y),...]*4  (đơn vị: mét)
            if src.shape == (4,2) and dst.shape == (4,2):
                H = cv2.getPerspectiveTransform(src, dst)
    except Exception as e:
        print(f"[!] Homography config invalid, fallback to pixel scale. Error: {e}")

    def px_to_world_xy(x, y):
        """Chuyển (x,y) pixel sang (X,Y) mặt phẳng thực (m). Nếu không có H, trả về None."""
        if H is None:
            return None
        pt = np.array([ [x, y, 1.0] ], dtype=np.float32).T  # 3x1
        wp = H @ pt
        if wp[2,0] == 0:
            return None
        X = float(wp[0,0] / wp[2,0])
        Y = float(wp[1,0] / wp[2,0])
        return (X, Y)

    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError(f"❌ Cannot open stream from {stream_url}")

    # ===== States =====
    vehicle_violations = {}  # Tracks if violation has been sent for this track
    frame_buffer = deque(maxlen=30)
    recording_tasks = {}
    kalman_filters = {}
    speed_history = {}
    last_time = {}               # per-track timestamp
    vote_counter = {}            # per-track overspeed counter
    pixel_to_meter = DISTANCE_REF / PIXEL_REF  # fallback scale nếu không có H
    VOTE_K = 15                  # Tăng để ổn định hơn, yêu cầu nhiều khung hơn để trigger
    SPEED_MARGIN = 5.0           # biên an toàn (km/h)
    SMOOTH_WINDOW = 30           # Tăng để smoothing tốt hơn, giảm fluctuation

    # Điều chỉnh Kalman params dựa trên hệ đo để chính xác hơn với xe xa (noisier)
    if H is not None:
        KF_R = np.array([[20, 0], [0, 20]], dtype=np.float32)  # Higher measurement noise for world coords to smooth more
        KF_Q = np.eye(4, dtype=np.float32) * 0.1  # Lower process noise for stable velocity estimate
    else:
        KF_R = np.array([[10, 0], [0, 10]], dtype=np.float32)
        KF_Q = np.eye(4, dtype=np.float32) * 0.5

    def init_kf():
        kf = KalmanFilter(dim_x=4, dim_z=2)
        kf.F = np.array([[1, 0, 1, 0],
                         [0, 1, 0, 1],
                         [0, 0, 1, 0],
                         [0, 0, 0, 1]], dtype=np.float32)
        kf.H = np.array([[1, 0, 0, 0],
                         [0, 1, 0, 0]], dtype=np.float32)
        kf.P *= 1000.0
        kf.R = KF_R
        kf.Q = KF_Q
        return kf

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            frame_annotated = frame.copy()
            frame_for_video = frame.copy()
            h, w, _ = frame.shape

            # Dùng ByteTrack của Ultralytics
            results = model.track(source=frame, persist=True, conf=0.5, iou=0.5, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
                frame_buffer.append(frame_for_video.copy())
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])[1].tobytes() +
                    b"\r\n"
                )
                continue

            active_track_ids = set()
            vehicle_boxes = []

            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = class_names.get(cls_id, model.names[cls_id])
                if class_name not in class_names.values():
                    continue

                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                track_id = int(results.boxes.id[i])
                active_track_ids.add(track_id)

                if (x2 - x1) < MIN_VEHICLE_SIZE or (y2 - y1) < MIN_VEHICLE_SIZE:
                    continue

                vehicle_boxes.append((x1, y1, x2, y2, track_id, class_name))

            for x1, y1, x2, y2, track_id, class_name in vehicle_boxes:
                # Bỏ qua nếu bbox quá nhỏ (xe quá xa, đo tốc độ không chính xác)
                if (y2 - y1) < MIN_VEHICLE_SIZE * 1.5:  # Tăng ngưỡng để bỏ xe xa hơn
                    continue

                # Tạo/khởi tạo track state
                if track_id not in kalman_filters:
                    kalman_filters[track_id] = init_kf()
                    speed_history[track_id] = deque(maxlen=SMOOTH_WINDOW)
                    last_time[track_id] = time.time()
                    vote_counter[track_id] = 0

                kf = kalman_filters[track_id]

                # Bottom-center bbox ở ảnh (giả sử chân xe gần mặt đường)
                cx, cy = (x1 + x2) / 2.0, y2

                # Đo ở hệ tọa độ nào?
                measure_world = px_to_world_xy(cx, cy)
                if measure_world is not None:
                    mx, my = measure_world  # mét
                    kf_measure = np.array([[mx], [my]], dtype=np.float32)
                else:
                    mx, my = cx, cy        # pixel
                    # Điều chỉnh pixel_to_meter động dựa trên y (giả sử perspective, scale giảm theo y)
                    # Giả sử horizon tại y=0, scale max tại y=h
                    dynamic_pixel_to_meter = pixel_to_meter * (h - cy) / h  # Scale nhỏ hơn khi y nhỏ (xa hơn)
                    kf_measure = np.array([[mx], [my]], dtype=np.float32)

                # dt per-track (ổn định khi drop frame)
                curr_t = time.time()
                dt = max(1e-3, curr_t - last_time[track_id])  # tránh 0
                last_time[track_id] = curr_t

                # Cập nhật F theo dt: vị trí += v*dt
                kf.F[0, 2] = dt
                kf.F[1, 3] = dt

                # Predict & Update
                kf.predict()
                kf.update(kf_measure)

                # Lấy vận tốc từ state
                vx, vy = float(kf.x[2]), float(kf.x[3])  # đơn vị phụ thuộc hệ đo ở trên

                # Tính tốc độ theo m/s
                if measure_world is not None:
                    meters_per_second = np.hypot(vx, vy)
                else:
                    pixels_per_second = np.hypot(vx, vy)
                    meters_per_second = pixels_per_second * dynamic_pixel_to_meter if 'dynamic_pixel_to_meter' in locals() else pixels_per_second * pixel_to_meter

                km_per_hour = meters_per_second * 3.6

                # Smoothing tốc độ
                speed_history[track_id].append(km_per_hour)
                avg_speed = float(np.mean(speed_history[track_id]))

                # Overspeed voting (giảm false positive)
                if avg_speed > (SPEED_LIMIT + SPEED_MARGIN):
                    vote_counter[track_id] += 1
                else:
                    vote_counter[track_id] = max(0, vote_counter[track_id] - 3)  # Decrement nhanh hơn để reset khi tốc độ giảm

                # Extract plate per vehicle
                vehicle_roi = frame[y1:y2, x1:x2]
                license_plate_text = extract_license_plate(vehicle_roi)

                if vote_counter[track_id] >= VOTE_K and track_id not in vehicle_violations and track_id not in recording_tasks:
                    vehicle_violations[track_id] = "OVERSPEED"
                    print(f"[+] OVERSPEED VIOLATION: Vehicle {track_id}, Plate: {license_plate_text}, Speed: {avg_speed:.2f} km/h")

                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_filename = f"overspeed_{track_id}_{timestamp}.jpg"
                    snapshot_filepath = os.path.join(VIOLATIONS_DIR, snapshot_filename)
                    cv2.imwrite(snapshot_filepath, frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    video_filename = f"overspeed_{track_id}_{timestamp}.mp4"
                    video_filepath = os.path.join(VIOLATIONS_DIR, video_filename)
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    writer = cv2.VideoWriter(video_filepath, fourcc, FRAME_RATE, (w, h))
                    for buf_frame in frame_buffer:
                        writer.write(buf_frame)
                    recording_tasks[track_id] = {
                        'writer': writer,
                        'frames_remaining': 30,
                        'file_path': video_filepath
                    }

                    violation_data = {
                        "camera": {"id": camera_id},
                        "vehicle": {"licensePlate": license_plate_text},
                        "vehicleType": {"id": 1},
                        "createdAt": datetime.now().isoformat(),
                        "status": "PENDING",
                        "violationDetails": [
                            {
                                "violationTypeId": 2,
                                "location": "Unknown",
                                "violationTime": datetime.now().isoformat(),
                                "additionalNotes": f"Track ID: {track_id}, Speed: {avg_speed:.2f} km/h"
                            }
                        ]
                    }

                    print(f"[+] Sending OVERSPEED violation for track {track_id} asynchronously...")
                    send_violation_async(violation_data, snapshot_filepath, video_filepath, track_id)

                # Vẽ hiển thị - red only if currently overspeeding
                color = (0, 0, 255) if avg_speed > (SPEED_LIMIT + SPEED_MARGIN) else (0, 255, 0)
                label = f"ID:{track_id} {class_name} Plate:{license_plate_text} V:{avg_speed:.1f} km/h"
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame_annotated, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # buffer trước-vi phạm
            frame_buffer.append(frame_for_video.copy())

            # ghi nốt video vi phạm
            for track_id in list(recording_tasks.keys()):
                task = recording_tasks[track_id]
                if task['frames_remaining'] > 0:
                    task['writer'].write(frame_for_video)
                    task['frames_remaining'] -= 1
                else:
                    task['writer'].release()
                    del recording_tasks[track_id]

            # dọn các track biến mất
            for track_id in list(kalman_filters.keys()):
                if track_id not in active_track_ids:
                    kalman_filters.pop(track_id, None)
                    speed_history.pop(track_id, None)
                    last_time.pop(track_id, None)
                    vote_counter.pop(track_id, None)
                    vehicle_violations.pop(track_id, None)

            # stream ra
            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    except Exception as e:
        print(f"[-] Error in stream_overspeed_service: {e}")
        traceback.print_exc()
    finally:
        cap.release()
        for task in recording_tasks.values():
            task['writer'].release()
        print("[+] Closed stream for camera")


def cleanup_on_exit():
    """Dọn dẹp thread pool khi thoát."""
    print("[+] Shutting down violation executor...")
    violation_executor.shutdown(wait=True)
    print("[+] Violation executor shutdown complete")

# Đăng ký hàm cleanup
atexit.register(cleanup_on_exit)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)