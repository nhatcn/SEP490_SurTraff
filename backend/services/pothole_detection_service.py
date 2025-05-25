import tempfile
import cv2
import os
from fastapi import UploadFile
from ultralytics import YOLO

# Đường dẫn tới model đã huấn luyện
MODEL_PATH = "best1.pt"

def detect_potholes_in_video(video_file: UploadFile) -> int:
    # Lưu file video tạm thời
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        temp_video.write(video_file.file.read())
        temp_video_path = temp_video.name

    # Load model YOLO
    model = YOLO(MODEL_PATH)

    # Mở video
    cap = cv2.VideoCapture(temp_video_path)
    if not cap.isOpened():
        raise RuntimeError("Cannot open video file")

    # Lấy thông tin video để ghi lại
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Đường dẫn lưu video kết quả
    output_path = r"C:\Users\mthon\Downloads\SEP490_SurTraff-main\backend\output_pothole.mp4"
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_potholes = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Dự đoán trên từng frame
        results = model(frame)
        for r in results:
            boxes = r.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                # Vẽ bounding box lên frame
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"Pothole", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)
                total_potholes += 1

        # Ghi frame đã vẽ vào video output
        out.write(frame)

    cap.release()
    out.release()
    return total_potholes