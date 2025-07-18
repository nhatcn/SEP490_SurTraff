def stream_violation_wrongway_video_service(youtube_url: str):
    model_plate = YOLO("yolov8m.pt")
    stream_url = get_stream_url(youtube_url)
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        raise ValueError("Cannot open stream")

    TARGET_CLASSES = {'car', 'truck', 'motorcycle'}

    # Kích thước video gốc (bạn cần thay chính xác theo video gốc của bạn)
    orig_w, orig_h = 3840, 2160  # Ví dụ video gốc 4K, thay bằng đúng kích thước video gốc của bạn

    # Vùng polygon stop line theo video gốc
    stop_line_zone1 = [(1405, 780), (1540, 765), (960, 2115), (190, 2110)]    
    stop_line_zone2 = [(1680, 740), (1545, 750), (955, 2130), (1750, 2065)]   
    stop_line_zone3 = [(1805, 675), (1925, 700), (3515, 2075), (2800, 2080)] 
    stop_line_zone4 = [(1940, 720), (2075, 735), (3800, 1785), (3615, 2145)]

    def scale_polygon(polygon, scale_x, scale_y):
        return [(int(x * scale_x), int(y * scale_y)) for x, y in polygon]

    def get_zones_for_class(cls, zones):
        return {
            'car': [zones[1], zones[3]],
            'truck': [zones[0], zones[2]],
            'motorcycle': [zones[2]]
        }.get(cls, [])

    def box_in_polygon(box, polygon, frame_shape, threshold=500):
        mask_poly = np.zeros((frame_shape[0], frame_shape[1]), dtype=np.uint8)
        cv2.fillPoly(mask_poly, [np.array(polygon, dtype=np.int32)], 255)

        x1, y1, x2, y2 = map(int, box)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(frame_shape[1], x2), min(frame_shape[0], y2)

        mask_box = np.zeros_like(mask_poly)
        cv2.rectangle(mask_box, (x1, y1), (x2, y2), 255, -1)

        intersection = cv2.bitwise_and(mask_poly, mask_box)
        inter_area = np.count_nonzero(intersection)

        return inter_area > threshold

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(stream_url)
                continue

            stream_h, stream_w = frame.shape[:2]

            scale_x = stream_w / orig_w
            scale_y = stream_h / orig_h

            zones_scaled = [
                scale_polygon(stop_line_zone1, scale_x, scale_y),
                scale_polygon(stop_line_zone2, scale_x, scale_y),
                scale_polygon(stop_line_zone3, scale_x, scale_y),
                scale_polygon(stop_line_zone4, scale_x, scale_y),
            ]

            colors = [(0,0,255), (0,255,0), (0,0,255), (0,255,0)]
            for i, zone in enumerate(zones_scaled):
                cv2.polylines(frame, [np.array(zone, np.int32)], isClosed=True, color=colors[i], thickness=3)
                # cx = int(np.mean([p[0] for p in zone]))
                # cy = int(np.mean([p[1] for p in zone]))
                # cv2.putText(frame, f"zone{i+1}", (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 1, colors[i], 2)

            results = model_plate(frame)[0]

            for box in results.boxes:
                cls_id = int(box.cls[0])
                class_name = model_plate.names[cls_id]

                if class_name not in TARGET_CLASSES:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                zones_for_cls = get_zones_for_class(class_name, zones_scaled)
                in_any_zone = any(box_in_polygon((x1, y1, x2, y2), zone, frame.shape) for zone in zones_for_cls)

                label = 'normal' if in_any_zone else 'wrongway'
                color = (0, 255, 0) if label == 'normal' else (0, 0, 255)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{class_name} - {label}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                if label == 'wrongway':
                    pass  # Không lưu ảnh, không ghi log

            _, jpeg = cv2.imencode('.jpg', frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )

    finally:
        cap.release()