from ultralytics import YOLO
import cv2

# Initialize YOLO model
model = YOLO("yolov8m.pt")

def process_frame(frame):
    """Process a single frame with YOLO and return the annotated frame as JPEG bytes."""
    # Run YOLO inference
    results = model(frame)
    annotated = results[0].plot()
    
    # Encode frame as JPEG
    _, jpeg = cv2.imencode('.jpg', annotated)
    frame_bytes = jpeg.tobytes()
    
    return frame_bytes