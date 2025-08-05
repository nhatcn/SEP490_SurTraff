import os
import cv2
import time
import numpy as np
from ultralytics import YOLO
from typing import List, Optional
import onnxruntime as ort
from services.tracking.byte_tracker import BYTETracker
from datetime import datetime
from collections import deque
import tempfile
import ffmpeg
import threading
from concurrent.futures import ThreadPoolExecutor
import atexit
from sqlalchemy.orm import Session
from models.model import Camera
from pydantic import BaseModel
import easyocr
import logging
from utils.yt_stream import get_stream_url

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load models
model_vehicle = YOLO("yolov8m.pt")
reid_model_path = "osnet_ain_x1_0_vehicle_reid_optimized.onnx"
ocr_reader = easyocr.Reader(['en'], gpu=True)

# Constants
VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)
YOLO_SCORE_TH = 0.3
REID_SCORE_TH = 0.5
FPS = 30

# Thread pool for async processing
tracking_executor = ThreadPoolExecutor(max_workers=5)

class VehicleReID0001:
    def __init__(self, model_path, score_th=0.5):
        self.score_th = score_th
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.gallery = {}  # {global_id: feature}

    def extract_features(self, image, bboxes):
        crops = []
        for box in bboxes:
            x1, y1, x2, y2 = map(int, box)
            crop = image[y1:y2, x1:x2]
            if crop.size == 0:
                crop = np.zeros((256, 128, 3), dtype=np.uint8)
            else:
                crop = cv2.resize(crop, (128, 256))
            crop = crop.astype(np.float32)
            crop -= np.array([123.675, 116.28, 103.53], dtype=np.float32)
            crop /= np.array([58.395, 57.12, 57.375], dtype=np.float32)
            crop = crop.transpose(2, 0, 1)
            crops.append(crop)

        if not crops:
            return np.empty((0, 512), dtype=np.float32)
        inputs = np.stack(crops).astype(np.float32)
        feats = self.session.run(None, {self.input_name: inputs})[0]
        feats /= np.linalg.norm(feats, axis=1, keepdims=True) + 1e-8
        return feats

    def match_or_register(self, features):
        ids = []
        for feat in features:
            matched_id = None
            best_sim = 0
            for gid, gfeat in self.gallery.items():
                sim = np.dot(feat, gfeat)
                if sim > self.score_th and sim > best_sim:
                    matched_id = gid
                    best_sim = sim

            if matched_id is None:
                new_id = len(self.gallery)
                self.gallery[new_id] = feat
                matched_id = new_id
            ids.append(matched_id)
        return ids

class ByteTrackWrapper:
    def __init__(self, track_thresh=0.3, match_thresh=0.9):
        self.tracker = BYTETracker(track_thresh=track_thresh, match_thresh=match_thresh)

    def update(self, bboxes, scores, class_ids, img_info):
        outputs = []
        if len(bboxes) > 0:
            detections = np.hstack((
                bboxes,
                np.array(scores).reshape(-1, 1),
                np.array(class_ids).reshape(-1, 1)
            ))
            online_targets = self.tracker.update(detections, img_info)
            for t in online_targets:
                tlwh = t.tlwh
                x1, y1, w, h = tlwh
                x2, y2 = x1 + w, y1 + h
                outputs.append((t.track_id, [x1, y1, x2, y2], t.score, int(t.cls)))
        return outputs

class VehicleInfo(BaseModel):
    brand: Optional[str] = None
    licensePlate: Optional[str] = None
    color: Optional[str] = None

def fetch_camera_config(camera_id: int, db: Session):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise ValueError(f"Camera {camera_id} not found in database")
    return {
        "id": camera.id,
        "name": camera.name,
        "location": camera.location or "Unknown",
        "latitude": camera.latitude or 0.0,
        "longitude": camera.longitude or 0.0,
        "status": camera.status,
        "stream_url": camera.stream_url,
        "thumbnail": camera.thumbnail or "/placeholder.svg"
    }

def read_license_plate(image, box):
    x1, y1, x2, y2 = map(int, box)
    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    try:
        results = ocr_reader.readtext(crop, detail=0)
        return results[0] if results else None
    except Exception as e:
        logger.error(f"Error reading license plate: {e}")
        return None

def stream_vehicle_tracking_service(camera_id: int, vehicle_info: VehicleInfo, search_image: Optional[bytes], db: Session):
    """
    Stream video with real-time vehicle tracking similar to red light violation service
    """
    try:
        # Get camera configuration
        camera_config = fetch_camera_config(camera_id, db)
        logger.info(f"Starting tracking stream for camera {camera_id}: {camera_config['name']}")
        
        # Get stream URL
        stream_url = get_stream_url(camera_config["stream_url"])
        cap = cv2.VideoCapture(stream_url)
        
        if not cap.isOpened():
            logger.error(f"Cannot open stream for camera {camera_id}")
            return
        
        # Initialize tracking components
        reid = VehicleReID0001(reid_model_path, score_th=REID_SCORE_TH)
        tracker = ByteTrackWrapper(track_thresh=0.3, match_thresh=0.9)
        local_to_global_id = {}
        target_ids = [2, 5, 7]  # car, bus, truck
        
        # Parse search image if provided
        search_features = None
        if search_image:
            search_img = cv2.imdecode(np.frombuffer(search_image, np.uint8), cv2.IMREAD_COLOR)
            if search_img is not None:
                # Extract features from entire search image (assuming it contains the vehicle)
                h, w = search_img.shape[:2]
                search_bbox = [[0, 0, w, h]]  # Use entire image as bounding box
                search_features = reid.extract_features(search_img, search_bbox)
                logger.info("Search image features extracted successfully")
        
        h, w = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)), int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_buffer = deque(maxlen=30)
        detected_vehicles = {}  # Store detected vehicles info
        
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Failed to read frame from camera {camera_id}, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue
            
            frame_annotated = frame.copy()
            frame_buffer.append(frame_annotated.copy())
            
            # Vehicle detection
            results = model_vehicle.predict(frame, conf=YOLO_SCORE_TH, iou=0.45, device='cuda')[0]
            boxes, scores, class_ids = [], [], []
            
            for box in results.boxes:
                cls = int(box.cls.item())
                if cls in target_ids:
                    boxes.append(box.xyxy[0].cpu().numpy())
                    scores.append(float(box.conf.item()))
                    class_ids.append(cls)
            
            # Track vehicles
            tracks = tracker.update(np.array(boxes), scores, class_ids, (h, w)) if boxes else []
            
            if tracks:
                bboxes = [t[1] for t in tracks]
                feats = reid.extract_features(frame, bboxes)
                
                for i, (tid, box, score, cls) in enumerate(tracks):
                    x1, y1, x2, y2 = map(int, box)
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    
                    # Get or assign global ID
                    key = f"cam_{camera_id}_{tid}"
                    if key not in local_to_global_id:
                        gid = reid.match_or_register([feats[i]])[0]
                        local_to_global_id[key] = gid
                    else:
                        gid = local_to_global_id[key]
                    
                    # Check if this vehicle matches search criteria
                    is_target_vehicle = False
                    match_score = 0.0
                    match_reason = ""
                    
                    # OCR license plate detection
                    detected_license_plate = read_license_plate(frame, box)
                    
                    # Match by license plate
                    if vehicle_info.licensePlate and detected_license_plate:
                        if (detected_license_plate == vehicle_info.licensePlate or 
                            detected_license_plate in vehicle_info.licensePlate or
                            vehicle_info.licensePlate in detected_license_plate):
                            is_target_vehicle = True
                            match_score = 0.95
                            match_reason = "License Plate Match"
                    
                    # Match by image features
                    if search_features is not None and len(search_features) > 0:
                        similarity = np.dot(feats[i], search_features[0])
                        if similarity > REID_SCORE_TH:
                            is_target_vehicle = True
                            match_score = max(match_score, similarity)
                            match_reason = "Image Feature Match" if match_reason == "" else f"{match_reason} + Image"
                    
                    # Match by vehicle info (brand, color) - simplified matching
                    if vehicle_info.brand or vehicle_info.color:
                        # This is a simplified implementation - in reality you'd need more sophisticated matching
                        if not is_target_vehicle:
                            match_score = 0.3  # Low confidence match based on metadata
                            match_reason = "Vehicle Info Match (Low Confidence)"
                    
                    # Store vehicle information
                    if gid not in detected_vehicles:
                        detected_vehicles[gid] = {
                            "first_seen": datetime.now(),
                            "last_seen": datetime.now(),
                            "detections": 0,
                            "best_match_score": 0.0,
                            "license_plates": set(),
                            "positions": []
                        }
                    
                    detected_vehicles[gid]["last_seen"] = datetime.now()
                    detected_vehicles[gid]["detections"] += 1
                    detected_vehicles[gid]["best_match_score"] = max(detected_vehicles[gid]["best_match_score"], match_score)
                    detected_vehicles[gid]["positions"].append((cx, cy))
                    
                    if detected_license_plate:
                        detected_vehicles[gid]["license_plates"].add(detected_license_plate)
                    
                    # Draw bounding box and information
                    if is_target_vehicle:
                        # Target vehicle - draw in red
                        color = (0, 0, 255)
                        thickness = 3
                        label = f"TARGET #{gid}"
                        
                        # Add match information
                        cv2.putText(frame_annotated, f"Match: {match_score:.2f}", 
                                    (x1, y1 - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                        cv2.putText(frame_annotated, match_reason, 
                                    (x1, y1 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                        
                        # Highlight detection
                        cv2.rectangle(frame_annotated, (x1-5, y1-5), (x2+5, y2+5), (0, 255, 255), 2)
                        
                    else:
                        # Regular vehicle - draw in green
                        color = (0, 255, 0)
                        thickness = 2
                        label = f"ID:{gid}"
                    
                    # Draw main bounding box
                    cv2.rectangle(frame_annotated, (x1, y1), (x2, y2), color, thickness)
                    cv2.putText(frame_annotated, label, (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    
                    # Add license plate if detected
                    if detected_license_plate:
                        cv2.putText(frame_annotated, f"LP: {detected_license_plate}", 
                                    (x1, y2 + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                    
                    # Add vehicle class
                    vehicle_class = model_vehicle.names[cls]
                    cv2.putText(frame_annotated, vehicle_class, 
                                (x1, y2 + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            # Draw camera information
            cv2.putText(frame_annotated, f"Camera: {camera_config['name']}", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame_annotated, f"Location: {camera_config['location']}", 
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame_annotated, f"Time: {datetime.now().strftime('%H:%M:%S')}", 
                        (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Draw search criteria
            search_info_y = 120
            if vehicle_info.licensePlate:
                cv2.putText(frame_annotated, f"Searching LP: {vehicle_info.licensePlate}", 
                            (10, search_info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                search_info_y += 25
            
            if vehicle_info.brand:
                cv2.putText(frame_annotated, f"Brand: {vehicle_info.brand}", 
                            (10, search_info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                search_info_y += 25
            
            if vehicle_info.color:
                cv2.putText(frame_annotated, f"Color: {vehicle_info.color}", 
                            (10, search_info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                search_info_y += 25
            
            if search_image:
                cv2.putText(frame_annotated, "Image Search Active", 
                            (10, search_info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
            
            # Draw detection statistics
            target_vehicles = sum(1 for v in detected_vehicles.values() if v["best_match_score"] > REID_SCORE_TH)
            cv2.putText(frame_annotated, f"Total Vehicles: {len(detected_vehicles)}", 
                        (w - 300, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame_annotated, f"Target Matches: {target_vehicles}", 
                        (w - 300, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            # Encode and yield frame
            _, jpeg = cv2.imencode('.jpg', frame_annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
            
    except Exception as e:
        logger.error(f"Error in stream_vehicle_tracking_service for camera {camera_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cap.release()
        logger.info(f"Stream cleanup completed for camera {camera_id}")

def cleanup_on_exit():
    logger.info("Shutting down tracking executor...")
    tracking_executor.shutdown(wait=True)
    logger.info("Tracking executor shutdown complete")

atexit.register(cleanup_on_exit)