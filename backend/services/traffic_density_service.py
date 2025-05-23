import cv2
import numpy as np
import os
from ultralytics import YOLO
from tempfile import NamedTemporaryFile
from schemas.traffic_density_schema import TrafficDensityResponse, LaneStatus

HEAVY_TRAFFIC_THRESHOLD = 10

# Định nghĩa polygon làn đường (copy từ notebook)
LANE_POLYGONS = [
    np.array([[0, 632], [235, 484], [430, 370], [561, 299], [656, 245], [656, 236], [676, 246], [654, 275], [631, 325], [611, 380], [579, 494], [526, 719]], dtype=np.int32),  # Lane trái
    np.array([[769, 717], [757, 691], [718, 544], [702, 464], [681, 376], [677, 332], [674, 297], [675, 262], [683, 243], [698, 241], [733, 271], [787, 330], [824, 359], [899, 414], [984, 473], [1126, 576], [1208, 632], [1232, 651], [1261, 669], [1279, 681], [1276, 719]], dtype=np.int32) # Lane phải
]

MODEL_PATH = "best.pt"
model = YOLO(MODEL_PATH)

def analyze_traffic_video(video_path):
    cap = cv2.VideoCapture(video_path)
    left_total, right_total, frame_count = 0, 0, 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        results = model.predict(frame, imgsz=640, conf=0.4)
        boxes = results[0].boxes.xyxy.cpu().numpy()
        left_count, right_count = 0, 0

        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            if cv2.pointPolygonTest(LANE_POLYGONS[0], (cx, cy), False) >= 0:
                left_count += 1
            elif cv2.pointPolygonTest(LANE_POLYGONS[1], (cx, cy), False) >= 0:
                right_count += 1

        left_total += left_count
        right_total += right_count
        frame_count += 1

    cap.release()

    # Parking Car
    left_avg = left_total // frame_count if frame_count else 0
    right_avg = right_total // frame_count if frame_count else 0

    left_status = "Heavy" if left_avg > HEAVY_TRAFFIC_THRESHOLD else "Smooth"
    right_status = "Heavy" if right_avg > HEAVY_TRAFFIC_THRESHOLD else "Smooth"

    return TrafficDensityResponse(
        frames=frame_count,
        left_lane=LaneStatus(stop_count=left_avg, status=left_status),
        right_lane=LaneStatus(stop_count=right_avg, status=right_status)
    )