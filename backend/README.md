# SurTraff Backend

This is the backend service for the SurTraff application, providing API endpoints for camera management, video stream processing, and object detection using YOLOv8.

## Setup

1. Create a PostgreSQL database named `surtraff`
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/surtraff
   ENVIRONMENT=development
   ```
4. Make sure you have the YOLOv8 model file `bestCOCO.pt` in the backend directory

## Running the Application

Start the FastAPI server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Cameras
- `POST /api/v1/cameras/` - Add a new camera
- `GET /api/v1/cameras/` - List all cameras
- `GET /api/v1/cameras/{camera_id}` - Get camera details
- `PUT /api/v1/cameras/{camera_id}` - Update camera details
- `DELETE /api/v1/cameras/{camera_id}` - Delete a camera

### Videos
- `POST /api/v1/videos/` - Add a new YouTube video (requires camera_id)
- `GET /api/v1/videos/` - List all videos
- `GET /api/v1/videos/{video_id}` - Get video details

### Detections
- `POST /api/v1/detections/{video_id}/process` - Process a video frame and get detections
- `GET /api/v1/detections/{video_id}` - Get detection results for a video

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc` 