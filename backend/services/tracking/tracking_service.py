import os
import cv2
import numpy as np
from ultralytics import YOLO
import onnxruntime as ort
from services.tracking.byte_tracker import BYTETracker
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models.model import Camera
import logging
from utils.yt_stream import get_stream_url
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
YOLO_SCORE_TH = 0.55
REID_SCORE_TH = 0.4  # Giảm ngưỡng để dễ đăng ký đặc trưng
TARGET_IDS = [2, 5, 7]  # car, bus, truck
HARDCODED_IMAGE_PATH = r"D:\multi_camera_tracking\videos\screenshot_1754414441.png"

# Load models
model_vehicle = YOLO("yolov8m.pt")
reid_model_path = "osnet_ain_x1_0_vehicle_reid_optimized.onnx"

class VehicleReID0001:
    def __init__(self, model_path, score_th=0.5):
        self.score_th = score_th
        self.session = ort.InferenceSession(model_path, providers=["CUDAExecutionProvider"])
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
            detections = np.hstack((bboxes, np.array(scores).reshape(-1, 1), np.array(class_ids).reshape(-1, 1)))
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

def get_id_color(index):
    temp_index = abs(int(index + 1)) * 3
    return (
        (37 * temp_index) % 255,
        (17 * temp_index) % 255,
        (29 * temp_index) % 255,
    )

def draw_debug(image, tracks, highlight_ids=None, similarities=None, camera_name="", search_error=None):
    highlight_ids = highlight_ids or set()
    similarities = similarities or {}
    debug_image = image.copy()
    for tid, box, score, cls in tracks:
        x1, y1, x2, y2 = map(int, box)
        color = (0, 0, 255) if tid in highlight_ids else get_id_color(tid)
        thickness = 4 if tid in highlight_ids else 2
        debug_image = cv2.rectangle(debug_image, (x1, y1), (x2, y2), color, thickness)
        text = f"ID:{tid}({score:.2f})"
        debug_image = cv2.putText(debug_image, text, (x1, y1 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        debug_image = cv2.putText(debug_image, f"cls:{cls}", (x1 + 2, y1 + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        if tid in highlight_ids:
            debug_image = cv2.putText(debug_image, f"TARGET (sim:{similarities.get(tid, 0):.2f})", 
                                      (x1, y2 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        else:
            debug_image = cv2.putText(debug_image, f"NON-TARGET (sim:{similarities.get(tid, 0):.2f})", 
                                      (x1, y2 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.6, get_id_color(tid), 2)
    cv2.putText(debug_image, f"Camera: {camera_name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    if search_error:
        cv2.putText(debug_image, f"Search Image Error: {search_error}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    return debug_image

def extract_boxes(results, target_ids):
    boxes, scores, class_ids = [], [], []
    for box in results.boxes:
        cls = int(box.cls.item())
        if cls in target_ids:
            boxes.append(box.xyxy[0].cpu().numpy())
            scores.append(float(box.conf.item()))
            class_ids.append(cls)
    return boxes, scores, class_ids

def fetch_camera_config(camera_id: int, db: Session):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise ValueError(f"Camera {camera_id} not found in database")
    return {
        "id": camera.id,
        "name": camera.name,
        "location": camera.location or "Unknown",
        "stream_url": camera.stream_url,
    }

def stream_vehicle_tracking_service(camera_id: int, vehicle_info: VehicleInfo, search_image: Optional[bytes], db: Session):
    try:
        camera_config = fetch_camera_config(camera_id, db)
        logger.info(f"Starting tracking stream for camera {camera_id}: {camera_config['name']}")
        stream_url = get_stream_url(camera_config["stream_url"])
        cap = cv2.VideoCapture(stream_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1000)  # Tăng buffer
        time.sleep(1)  # Chờ stream ổn định

        if not cap.isOpened():
            logger.error(f"Cannot open stream for camera {camera_id}")
            return

        reid = VehicleReID0001(reid_model_path, score_th=REID_SCORE_TH)
        reid.gallery = {}  # Reset gallery
        tracker = ByteTrackWrapper(track_thresh=0.3, match_thresh=0.9)
        local_to_global_id = {}  # Reset local_to_global_id

        search_features = None
        search_error = None
        # Try search_image first
        if search_image:
            query_img = cv2.imdecode(np.frombuffer(search_image, np.uint8), cv2.IMREAD_COLOR)
            if query_img is None:
                search_error = "Cannot read search image"
                logger.warning(search_error)
            else:
                results_query = model_vehicle.predict(query_img, conf=YOLO_SCORE_TH, iou=0.45, device='cuda')[0]
                boxes_query, scores_query, class_ids_query = extract_boxes(results_query, TARGET_IDS)
                if boxes_query:
                    max_score_idx = np.argmax(scores_query)
                    selected_box = boxes_query[max_score_idx]
                    feats_query = reid.extract_features(query_img, [selected_box])
                    if len(feats_query) > 0:
                        search_features = feats_query[0]
                        search_features /= np.linalg.norm(search_features, axis=0, keepdims=True) + 1e-8
                        logger.info("Search image features extracted successfully")
                    else:
                        search_error = "No features extracted from search image"
                        logger.warning(search_error)
                else:
                    search_error = "No vehicles detected in search image"
                    logger.warning(search_error)

        # If search_image fails or not provided, try hardcoded image
        if search_features is None:
            try:
                query_img = cv2.imread(HARDCODED_IMAGE_PATH)
                if query_img is None:
                    search_error = f"Cannot read hardcoded image: {HARDCODED_IMAGE_PATH}"
                    logger.warning(search_error)
                else:
                    results_query = model_vehicle.predict(query_img, conf=YOLO_SCORE_TH, iou=0.45, device='cuda')[0]
                    boxes_query, scores_query, class_ids_query = extract_boxes(results_query, TARGET_IDS)
                    if boxes_query:
                        max_score_idx = np.argmax(scores_query)
                        selected_box = boxes_query[max_score_idx]
                        feats_query = reid.extract_features(query_img, [selected_box])
                        if len(feats_query) > 0:
                            search_features = feats_query[0]
                            search_features /= np.linalg.norm(search_features, axis=0, keepdims=True) + 1e-8
                            logger.info(f"Hardcoded image features extracted successfully from {HARDCODED_IMAGE_PATH}")
                        else:
                            search_error = f"No features extracted from hardcoded image: {HARDCODED_IMAGE_PATH}"
                            logger.warning(search_error)
                    else:
                        search_error = f"No vehicles detected in hardcoded image: {HARDCODED_IMAGE_PATH}"
                        logger.warning(search_error)
            except Exception as e:
                search_error = f"Error reading hardcoded image: {str(e)}"
                logger.warning(search_error)

        h, w = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)), int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret or frame is None or frame.size == 0:
                logger.warning(f"Invalid frame from camera {camera_id}, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1000)
                time.sleep(0.5)
                continue

            logger.info(f"[INFO] Processing frame {frame_idx} for camera {camera_id}")
            logger.info(f"Frame {frame_idx}: {len(extract_boxes(model_vehicle.predict(frame, conf=YOLO_SCORE_TH, iou=0.45, device='cuda')[0], TARGET_IDS)[0])} objects detected")
            results = model_vehicle.predict(frame, conf=YOLO_SCORE_TH, iou=0.45, device='cuda')[0]
            boxes, scores, class_ids = extract_boxes(results, TARGET_IDS)
            tracks = tracker.update(np.array(boxes), scores, class_ids, (h, w)) if boxes else []
            logger.info(f"Frame {frame_idx}: {len(tracks)} tracks generated")

            highlight_track_ids = set()
            similarities = {}
            if tracks:
                bboxes = [t[1] for t in tracks]
                feats = reid.extract_features(frame, bboxes)
                logger.info(f"Frame {frame_idx}: {len(feats)} features extracted, gallery size: {len(reid.gallery)}")
                for i, (tid, box, score, cls) in enumerate(tracks):
                    key = f"{id(tracks)}_{tid}"
                    if key not in local_to_global_id:
                        gid = reid.match_or_register([feats[i]])[0]
                        local_to_global_id[key] = gid
                    else:
                        gid = local_to_global_id[key]
                    if search_features is not None:
                        sim = np.dot(feats[i], search_features)
                        similarities[gid] = sim
                        if sim > 0.66:
                            highlight_track_ids.add(gid)
                    tracks[i] = (gid, box, score, cls)
            if search_features is None and search_error:
                logger.info(f"Frame {frame_idx}: Search error - {search_error}")

            debug_frame = draw_debug(frame, tracks, highlight_track_ids, similarities, camera_name=camera_config["name"], search_error=search_error)
            _, jpeg = cv2.imencode('.jpg', debug_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

            frame_idx += 1

    except Exception as e:
        logger.error(f"Error in stream_vehicle_tracking_service for camera {camera_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cap.release()
        logger.info(f"Stream cleanup completed for camera {camera_id}")