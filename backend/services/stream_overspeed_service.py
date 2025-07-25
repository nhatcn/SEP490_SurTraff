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
import torch
import torchvision.transforms as transforms

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
FRAME_RATE = 30  # FPS
STANDARD_WIDTH = 640
STANDARD_HEIGHT = 480
ROI_SCALE = 1.5  # Scale for head region
MIN_HEAD_SIZE = 20  # Minimum head size (pixels)

# Load models
try:
    model_vehicle = YOLO("yolov8m.pt")
    model_license_plate = YOLO("best90.pt")
except Exception as e:
    print(f"Error loading YOLO models: {e}")
    exit(1)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Define ResNetBarlowTwins class
class ResNetBarlowTwins(torch.nn.Module):
    def __init__(self, num_classes=2):
        super(ResNetBarlowTwins, self).__init__()
        self.resnet = torchvision.models.resnet18(weights=None)
        self.feature_dim = self.resnet.fc.in_features
        self.resnet.fc = torch.nn.Identity()
        self.projector = torch.nn.Sequential(
            torch.nn.Linear(self.feature_dim, 2048),
            torch.nn.BatchNorm1d(2048),
            torch.nn.ReLU(inplace=True),
            torch.nn.Linear(2048, 2048)
        )
        self.fc = torch.nn.Linear(self.feature_dim, num_classes)

    def forward(self, x, return_features=False):
        features = self.resnet(x)
        if return_features:
            return features
        proj = self.projector(features)
        logits = self.fc(features)
        return logits, proj

# Load helmet detection model
try:
    model_helmet = ResNetBarlowTwins(num_classes=2).to(device)
    model_helmet.load_state_dict(torch.load(r"D:\DATN\frontend.18.7\SEP490_SurTraff\backend\model_barlow_fixmatch.pth", map_location=device))
    model_helmet.eval()
    print("Loaded PyTorch helmet classifier model successfully")
except Exception as e:
    print(f"Error loading helmet classifier model: {e}")
    model_helmet = None

try:
    ocr_reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available())
except Exception as e:
    print(f"Error initializing EasyOCR: {e}")
    exit(1)

def extract_license_plate(frame, boxes, vehicle_box):
    """
    Extract license plate text
    """
    x1_v, y1_v, x2_v, y2_v = vehicle_box
    cx_v, cy_v = (x1_v + x2_v) / 2, (y1_v + y2_v) / 2
    license_plate_text = "Unknown"
    
    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        if (abs(cx - cx_v) < (x2_v - x1_v) / 1.5 and abs(cy - cy_v) < (y2_v - y1_v) / 1.5):
            plate_roi = frame[y1:y2, x1:x2]
            if plate_roi.size > 0:
                try:
                    plate_roi = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
                    plate_roi = cv2.equalizeHist(plate_roi)
                    ocr_results = ocr_reader.readtext(plate_roi, detail=0)
                    license_plate_text = ocr_results[0] if ocr_results else "Unknown"
                    license_plate_text = "".join(c for c in license_plate_text if c.isalnum()).upper()
                except Exception as e:
                    print(f"Error in OCR: {e}")
                    license_plate_text = "Unknown"
            break
    return license_plate_text

def preprocess_head_roi(roi, target_size=(224, 224)):
    """
    Preprocess head ROI for PyTorch ResNet input
    """
    if roi.size == 0 or roi.shape[0] < MIN_HEAD_SIZE or roi.shape[1] < MIN_HEAD_SIZE:
        return None
    roi = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    roi = cv2.resize(roi, target_size)
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
    ])
    roi_tensor = transform(roi).unsqueeze(0)
    return roi_tensor

def process_local_video(video_path: str, camera_id: int):
    """
    Process a local video file for helmet violation detection
    """
    if not os.path.exists(video_path):
        raise ValueError(f"❌ Video file does not exist: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"❌ Cannot open video file {video_path}")

    # Initialize OpenCV window
    cv2.namedWindow("Video", cv2.WINDOW_NORMAL)

    vehicle_violations = {}
    frame_buffer = deque(maxlen=30)
    recording_tasks = {}
    frame_count = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("End of video file")
                break

            frame_count += 1
            print(f"\n[Frame {frame_count}] Processing at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

            frame_annotated = frame.copy()
            frame_for_video = frame.copy()
            h, w, _ = frame.shape

            # Resize frame to standard size
            frame = cv2.resize(frame, (STANDARD_WIDTH, STANDARD_HEIGHT))
            frame_annotated = cv2.resize(frame_annotated, (STANDARD_WIDTH, STANDARD_HEIGHT))
            frame_for_video = cv2.resize(frame_for_video, (STANDARD_WIDTH, STANDARD_HEIGHT))

            plate_results = model_license_plate(frame, conf=0.4, iou=0.4)[0]
            plate_boxes = plate_results.boxes if plate_results.boxes is not None else []

            results = model_vehicle.track(source=frame, persist=True, conf=0.3, iou=0.4, tracker="bytetrack.yaml")[0]
            if results.boxes is None or results.boxes.id is None:
                print("No motorbikes detected in this frame")
                frame_buffer.append(frame_for_video.copy())
                cv2.imshow("Video", frame_annotated)
                cv2.waitKey(1)
                continue

            active_track_ids = set()
            motorbike_detected = False
            for i in range(len(results.boxes)):
                cls_id = int(results.boxes.cls[i])
                class_name = model_vehicle.names[cls_id]
                if class_name != 'motorbike':  # Only process motorbikes
                    continue

                motorbike_detected = True
                x1, y1, x2, y2 = map(int, results.boxes.xyxy[i])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                track_id = int(results.boxes.id[i])
                active_track_ids.add(track_id)

                license_plate_text = extract_license_plate(frame, plate_boxes, (x1, y1, x2, y2))
                head_height = int((y2 - y1) / 3 * ROI_SCALE)
                head_width = int((x2 - x1) * ROI_SCALE)
                head_x1 = max(0, int(x1 - (head_width - (x2 - x1)) / 2))
                head_y1 = max(0, y1)
                head_x2 = min(STANDARD_WIDTH, head_x1 + head_width)
                head_y2 = min(STANDARD_HEIGHT, head_y1 + head_height)

                no_helmet = False
                if head_x2 > head_x1 and head_y2 > head_y1 and model_helmet:
                    head_roi = frame[head_y1:head_y2, head_x1:head_x2]
                    head_input = preprocess_head_roi(head_roi)
                    if head_input is not None:
                        try:
                            with torch.no_grad():
                                head_input = head_input.to(device)
                                logits, _ = model_helmet(head_input)
                                probabilities = torch.softmax(logits, dim=1)
                                no_helmet = probabilities[0][0].item() > 0.5
                        except Exception as e:
                            print(f"Error in helmet prediction for track ID {track_id}: {e}")

                status = "NO HELMET" if no_helmet else "HELMET OK"
                print(f"Vehicle ID: {track_id}, Type: {class_name}, Plate: {license_plate_text}, Status: {status}")

                # Draw bounding box and label
                color = (0, 0, 255) if no_helmet else (0, 255, 0)
                cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, 2)
                label = f"ID:{track_id} {class_name} Plate: {license_plate_text} {status}"
                cv2.putText(frame_annotated, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                if head_x2 > head_x1 and head_y2 > head_y1:
                    cv2.rectangle(frame_annotated, (head_x1, head_y1), (head_x2, head_y2), color, 1)

                if no_helmet and track_id not in vehicle_violations:
                    vehicle_violations[track_id] = "NO_HELMET"
                    print(f"VIOLATION DETECTED: Vehicle {track_id} (motorbike), Plate: {license_plate_text}, No Helmet")

                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_filename = f"no_helmet_{track_id}_{timestamp}.jpg"
                    snapshot_filepath = os.path.join(VIOLATIONS_DIR, snapshot_filename)
                    cv2.imwrite(snapshot_filepath, frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    video_filename = f"no_helmet_{track_id}_{timestamp}.mp4"
                    video_filepath = os.path.join(VIOLATIONS_DIR, video_filename)
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    writer = cv2.VideoWriter(video_filepath, fourcc, FRAME_RATE, (STANDARD_WIDTH, STANDARD_HEIGHT))
                    for buf_frame in frame_buffer:
                        writer.write(buf_frame)
                    recording_tasks[track_id] = {
                        'writer': writer,
                        'frames_remaining': 30,
                        'file_path': video_filepath
                    }

                    # Call API POST /api/violations
                    violation_data = {
                        "camera": {"id": camera_id},
                        "vehicle": {"licensePlate": license_plate_text},
                        "vehicleType": {"id": 1},  # Assume ID 1 for motorbike
                        "createdAt": datetime.now().isoformat(),
                        "status": "PENDING",
                        "violationDetails": [
                            {
                                "violationTypeId": 1,  # Assume ID 1 for NO_HELMET
                                "location": "Unknown",
                                "violationTime": datetime.now().isoformat(),
                                "additionalNotes": f"Track ID: {track_id}"
                            }
                        ]
                    }

                    try:
                        with open(snapshot_filepath, "rb") as img_file, open(video_filepath, "rb") as vid_file:
                            files = {
                                "imageFile": (snapshot_filename, img_file, "image/jpeg"),
                                "videoFile": (video_filename, vid_file, "video/mp4")
                            }
                            data = {"Violation": json.dumps(violation_data)}
                            response = requests.post(
                                "http://localhost:8081/api/violations",
                                files=files,
                                data=data,
                                timeout=5
                            )
                            response.raise_for_status()
                            print(f"Violation saved to API: {response.json()}")
                    except requests.exceptions.RequestException as e:
                        print(f"Error saving violation to API: {e}")
                        # Log violation locally as a fallback
                        log_file = os.path.join(VIOLATIONS_DIR, f"violation_{track_id}_{timestamp}.json")
                        with open(log_file, 'w') as f:
                            json.dump(violation_data, f, indent=4)
                        print(f"Violation logged locally as fallback: {log_file}")

            if not motorbike_detected:
                print("No motorbikes detected in this frame")

            frame_buffer.append(frame_for_video.copy())

            for track_id in list(recording_tasks.keys()):
                task = recording_tasks[track_id]
                if task['frames_remaining'] > 0:
                    task['writer'].write(frame_for_video)
                    task['frames_remaining'] -= 1
                else:
                    task['writer'].release()
                    del recording_tasks[track_id]

            for track_id in list(vehicle_violations.keys()):
                if track_id not in active_track_ids:
                    vehicle_violations.pop(track_id, None)

            cv2.imshow("Video", frame_annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except Exception as e:
        print(f"Error in process_local_video: {e}")
        traceback.print_exc()
    finally:
        cap.release()
        for task in recording_tasks.values():
            task['writer'].release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    video_path = "abc.mp4"  # Replace with your actual video file path
    camera_id = 1  # Replace with your camera ID if needed
    process_local_video(video_path, camera_id)