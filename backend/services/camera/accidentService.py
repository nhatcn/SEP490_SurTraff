import os
import cv2
import math
import time
from datetime import datetime
from collections import deque

from ultralytics import YOLO
from database import SessionLocal
from models.model import Violation
from schemas.violation_schema import ViolationCreate
from utils.yt_stream import get_stream_url
from crud import violation_crud  
import traceback
import numpy as np

def stream_accident_video_service(youtube_url: str):
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    model_accident = YOLO("accident.pt")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            results = model_accident(frame)[0]
            annotated_frame = frame.copy()

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

            _, jpeg = cv2.imencode('.jpg', annotated_frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
    finally:
        cap.release()
        
        
def extract_thumbnail_from_stream_url(youtube_url: str) -> bytes:
    """
    Trích xuất thumbnail (ảnh JPEG đầu tiên) từ stream YouTube.
    """
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Không thể mở stream từ URL.")

    frame = None
    for _ in range(10):
        ret, temp_frame = cap.read()
        if ret and temp_frame is not None:
            frame = temp_frame
            break

    cap.release()

    if frame is None:
        raise ValueError("Không thể đọc frame từ stream sau nhiều lần thử.")

    ret, buffer = cv2.imencode(".jpg", frame)
    if not ret:
        raise ValueError("Lỗi khi encode frame thành JPEG.")

    return buffer.tobytes()