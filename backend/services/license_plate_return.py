import cv2
import numpy as np
from ultralytics import YOLO
import easyocr

# Initialize YOLOv8 model and EasyOCR reader
model = YOLO('backend/best90.pt')
reader = easyocr.Reader(['en'], gpu=True)

def preprocess_plate_image(plate_img):
    # Convert to grayscale
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Adaptive thresholding to binarize image
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Contrast Limited Adaptive Histogram Equalization (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Combine thresholded and enhanced images
    processed = cv2.bitwise_and(enhanced, enhanced, mask=thresh)
    
    return processed

def get_license_plate_text(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return []

    # YOLOv8 detection
    results = model(img)
    texts = []

    for result in results:
        for box in result.boxes:
            if box.conf[0] > 0.6:  # Increased confidence threshold
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                plate_img = img[y1:y2, x1:x2]
                
                # Preprocess the license plate image
                processed_img = preprocess_plate_image(plate_img)
                
                # Run EasyOCR with adjusted parameters
                ocr_results = reader.readtext(
                    processed_img,
                    detail=0,
                    paragraph=False,
                    contrast_ths=0.1,  # Lower contrast threshold
                    adjust_contrast=0.5,  # Adjust contrast
                    text_threshold=0.7  # Higher text confidence
                )
                text = ' '.join(ocr_results).strip()
                if text:
                    texts.append(text)

    return texts

