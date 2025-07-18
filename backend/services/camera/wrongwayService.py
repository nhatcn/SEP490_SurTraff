import cv2
import numpy as np
from ultralytics import YOLO
import time
# For actual YouTube stream URL extraction, you might need a library like yt-dlp.
# Example: pip install yt-dlp

# Helper function to put text with a background for better visibility
def put_text_with_background(img, text, org, font=cv2.FONT_HERSHEY_SIMPLEX,
                             font_scale=0.5, text_color=(255, 255, 255),
                             bg_color=(0, 0, 0), thickness=1):
    """
    Puts text on an image with a background rectangle for better visibility.
    """
    (w, h), _ = cv2.getTextSize(text, font, font_scale, thickness)
    x, y = org
    overlay = img.copy()
    cv2.rectangle(overlay, (x, y - h - 3), (x + w, y + 3), bg_color, -1)
    alpha = 0.6
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
    cv2.putText(img, text, (x, y), font, font_scale, text_color, thickness, cv2.LINE_AA)

# Placeholder for getting stream URL from a YouTube link
def get_stream_url(youtube_url: str) -> str:
    """
    In a real application, you'd typically use a library like yt-dlp to extract the direct
    video stream URL from a YouTube link, as OpenCV's VideoCapture often cannot directly
    open YouTube URLs.

    For demonstration purposes, this function simply returns the input URL.
    You would need to implement the actual stream URL extraction here.

    Example with yt-dlp (requires installation: pip install yt-dlp):
    import yt_dlp
    try:
        ydl_opts = {'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best', 'quiet': True, 'noplaylist': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            # Find a suitable stream URL, e.g., a direct MP4 link
            for f in info.get('formats', []):
                if 'url' in f and 'ext' in f and f['ext'] == 'mp4':
                    return f['url']
            return info.get('url', youtube_url) # Fallback if no specific mp4 stream found
    except Exception as e:
        print(f"Error extracting stream URL with yt-dlp: {e}")
    """
    print(f"Attempting to open stream for: {youtube_url}. Note: Direct YouTube URLs often require a library like yt-dlp to extract the actual video stream URL.")
    return youtube_url # This will likely fail for direct YouTube URLs without yt-dlp

# Updated function signature to accept camera_id and db
def stream_violation_wrongway_video_service(youtube_url: str, camera_id: int = None, db: any = None):
    """
    Streams video frames with traffic sign and vehicle detection, and wrong-way violation checks.

    Args:
        youtube_url (str): The URL of the YouTube video stream.
        camera_id (int, optional): An ID for the camera/stream, useful for logging or database. Defaults to None.
        db (any, optional): A database connection object, if needed for logging violations. Defaults to None.
    """
    # --- Configuration ---
    # Model paths. IMPORTANT: Local paths like "D:\..." will not work in a cloud environment.
    # You would need to host these models (e.g., on cloud storage) and provide their URLs,
    # or use pre-trained models that ultralytics can download automatically.
    model_sign_path = "trafficsign.pt" # Placeholder for your custom sign detection model
    model_vehicle_name = "yolov8m.pt" # YOLOv8 medium model for vehicle detection

    try:
        # Load YOLO models
        model_sign = YOLO(model_sign_path)
        model_vehicle = YOLO(model_vehicle_name)
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        print("Please check model paths and ensure 'ultralytics' is installed and models are accessible.")
        return # Exit if models cannot be loaded

    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        print(f"❌ Cannot open stream from URL: {stream_url}. Please ensure the URL is a direct video stream or use yt-dlp.")
        raise ValueError("Cannot open stream")

    # Get original video dimensions from the stream
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Target processing dimensions (fixed for consistent processing)
    width, height = 640, 640

    # Calculate scaling factors for coordinates from original to target processing size
    scale_x = width / original_width
    scale_y = height / original_height

    # Constants for sign thumbnail display
    OBJECT_SIZE = 64 # Size of the traffic sign thumbnail
    MARGIN = 10      # Margin between elements
    estimated_text_area_height = 25 # Estimated height for text below thumbnail

    # Original zone data and display colors (from your second snippet)
    # Each tuple contains (list_of_points_for_polygon, BGR_color_for_drawing)
    original_zones_data = [
        ([(744, 404), (212, 1016), (540, 1044), (832, 428)], (0, 255, 0)),  # Zone 1 - Green (e.g., allowed for motorcycles)
        ([(828, 424), (560, 1016), (932, 1028), (936, 428)], (0, 0, 255)),    # Zone 2 - Red (e.g., allowed for cars/trucks)
        ([(956, 440), (1016, 1024), (1372, 1004), (1060, 444)], (0, 0, 255)), # Zone 3 - Red (e.g., allowed for cars/trucks)
        ([(1064, 448), (1376, 1024), (1688, 984), (1164, 444)], (0, 255, 0)), # Zone 4 - Green (e.g., allowed for motorcycles)
    ]

    # Define allowed vehicles in each zone based on their index in original_zones_data
    zone_allowed_vehicles = {
        0: ['motorcycle'],  # Zone 1 allows motorcycles
        1: ['car', 'truck'], # Zone 2 allows cars and trucks
        2: ['car', 'truck'], # Zone 3 allows cars and trucks
        3: ['motorcycle'],  # Zone 4 allows motorcycles
    }

    # Vehicle classes we are interested in for detection and violation checks
    target_vehicle_classes = ['car', 'motorcycle', 'truck']

    # Scale zones once before the main processing loop to the target processing dimensions
    scaled_zones = []
    for zone_points, color in original_zones_data:
        scaled_points = []
        for x, y in zone_points:
            scaled_x = int(x * scale_x)
            scaled_y = int(y * scale_y)
            scaled_points.append((scaled_x, scaled_y))
        scaled_zones.append((scaled_points, color))

    print(f"Starting stream processing for camera ID: {camera_id}. Original video dimensions: {original_width}x{original_height}, Processing frames at: {width}x{height}")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Stream ended or cannot read frame. Attempting to re-open stream...")
                cap.release()
                time.sleep(1) # Wait a bit before retrying to open the stream
                cap = cv2.VideoCapture(stream_url)
                if not cap.isOpened():
                    print("Failed to re-open stream. Exiting processing loop.")
                    break # Exit loop if stream cannot be re-opened
                continue

            # Resize the frame for consistent processing
            resized_frame = cv2.resize(frame, (width, height))
            annotated_frame = resized_frame.copy()

            # Draw the defined zones on the annotated frame with transparency
            alpha = 0.4
            for zone_points, color in scaled_zones:
                overlay = annotated_frame.copy()
                pts = np.array(zone_points, np.int32)
                pts = pts.reshape((-1, 1, 2)) # Reshape for cv2.fillPoly and cv2.polylines
                cv2.fillPoly(overlay, [pts], color)
                cv2.addWeighted(overlay, alpha, annotated_frame, 1 - alpha, 0, annotated_frame)
                cv2.polylines(annotated_frame, [pts], isClosed=True, color=color, thickness=2)

            # --- Traffic Sign Detection ---
            results_sign = model_sign(resized_frame, conf=0.1) # Run inference on the resized frame
            boxes_sign = results_sign[0].boxes # Get detected bounding boxes for signs

            current_display_y = MARGIN # Starting Y position for sign thumbnails on the top right
            for idx, box in enumerate(boxes_sign):
                cls_id = int(box.cls)
                label = model_sign.names[cls_id]
                x1, y1, x2, y2 = map(int, box.xyxy[0]) # Bounding box coordinates

                # Ensure coordinates are within frame boundaries
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(width, x2), min(height, y2)

                if x2 <= x1 or y2 <= y1: # Skip invalid boxes
                    continue

                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 165, 255), 2) # Draw orange rectangle for sign
                crop = resized_frame[y1:y2, x1:x2] # Crop the sign region

                if crop.size == 0: # Skip if crop is empty
                    continue

                crop_resized = cv2.resize(crop, (OBJECT_SIZE, OBJECT_SIZE)) # Resize for thumbnail
                thumbnail_x = width - OBJECT_SIZE - MARGIN # X position for thumbnail
                thumbnail_y = current_display_y # Y position for thumbnail

                # Check if there's enough space for the next thumbnail + text
                if thumbnail_y + OBJECT_SIZE + MARGIN + estimated_text_area_height > height:
                    break # Stop displaying if out of vertical space

                # Place the thumbnail on the annotated frame
                annotated_frame[thumbnail_y:thumbnail_y + OBJECT_SIZE, thumbnail_x:thumbnail_x + OBJECT_SIZE] = crop_resized

                # Add text label below the thumbnail
                text_org_y = thumbnail_y + OBJECT_SIZE + MARGIN
                put_text_with_background(annotated_frame, label, (thumbnail_x, text_org_y),
                                         font_scale=0.6, text_color=(255,255,255), bg_color=(0,0,0), thickness=2)

                current_display_y += OBJECT_SIZE + MARGIN + estimated_text_area_height + MARGIN # Update Y for next thumbnail

            # --- Vehicle Detection and Violation Check ---
            results_vehicle = model_vehicle(resized_frame, conf=0.3) # Run inference for vehicles
            for result in results_vehicle:
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = model_vehicle.names[cls_id]

                    if cls_name not in target_vehicle_classes: # Only process target vehicle classes
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0]) # Bounding box coordinates
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(width, x2), min(height, y2)

                    if x2 <= x1 or y2 <= y1: # Skip invalid boxes
                        continue

                    label = f"{cls_name} {box.conf[0]:.2f}"
                    bbox_color = (255, 255, 255) # Default white color for bounding box
                    is_violation = False

                    # Calculate the center of the vehicle's bounding box
                    vehicle_center_x = (x1 + x2) // 2
                    vehicle_center_y = (y1 + y2) // 2

                    # Check if the vehicle's center is within any defined zone and if it's a violation
                    for zone_idx, (zone_points, _) in enumerate(scaled_zones):
                        pts_for_test = np.array(zone_points, np.int32).reshape((-1, 2))

                        # Check if the vehicle's center point is inside the current zone
                        if cv2.pointPolygonTest(pts_for_test, (vehicle_center_x, vehicle_center_y), False) >= 0:
                            allowed_classes_in_zone = zone_allowed_vehicles.get(zone_idx, [])
                            if cls_name not in allowed_classes_in_zone:
                                is_violation = True
                                bbox_color = (0, 0, 255) # Red color for violation
                                label += " - VIOLATION" # Append violation text to label
                                # You can use camera_id and db here to log the violation
                                # For example:
                                # if db and camera_id:
                                #     print(f"VIOLATION detected in camera {camera_id}: {cls_name} in zone {zone_idx}")
                                #     # db.violations.insert({"camera_id": camera_id, "vehicle_type": cls_name, "zone_id": zone_idx, "timestamp": time.time()})
                                break # Found a violation, no need to check other zones

                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), bbox_color, 2) # Draw bounding box
                    put_text_with_background(annotated_frame, label, (x1, y1 - 5), font_scale=0.5) # Add label

            # Encode the annotated frame as JPEG bytes
            _, jpeg = cv2.imencode('.jpg', annotated_frame)

            # Yield the frame in MJPEG format for streaming
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        # Ensure the video capture object is released when the function exits
        if cap.isOpened():
            cap.release()
        print("Stream processing finished and resources released.")