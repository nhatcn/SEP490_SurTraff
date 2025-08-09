from fastapi import APIRouter, Depends, HTTPException, Body, Form, File, UploadFile
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse, Response, JSONResponse
from fastapi.encoders import jsonable_encoder
import cv2
import json
from typing import Optional, List
from pydantic import BaseModel

from services.camera.camera_service import (
    stream_normal_video_service,
    stream_violation_video_service,
    stream_violation_video_service1,
    stream_count_video_service,
    stream_plate_with_ocr_video_service,
    stream_violation_wrongway_video_service
)

from services.camera.accidentService import stream_accident_video_service
from services.stream_overspeed_service import stream_overspeed_service
from services.nohelmet_service import stream_no_helmet_service
from services.camera.wrongwayService import stream_violation_wrongway_video_service1
from services.pothole_detection_service import detect_potholes_in_video
from services.camera.red_light_violation_service import (
    stream_violation_video_service1,
    extract_thumbnail_from_stream_url
)
from services.camera.illegalparkingService import (
    analyze_traffic_video,
    extract_thumbnail_from_stream_url
)
from db.session import get_db
from models.model import Camera
from schemas.camera_schema import CameraCreate, CameraUpdate

# Import updated tracking service
from services.tracking.tracking_service import stream_vehicle_tracking_service

router = APIRouter()

# ✅ Global in-memory storage for search images per camera
search_images_by_camera = {}  # camera_id -> image_bytes

class VehicleInfo(BaseModel):
    brand: Optional[str] = None
    licensePlate: Optional[str] = None
    color: Optional[str] = None

class TrackingSession(BaseModel):
    sessionId: str
    cameraIds: List[int]
    vehicle: VehicleInfo
    startTime: str
    status: str
    searchMethod: str

@router.post("/thumbnail/extract")
def extract_thumbnail(stream_url: str = Body(..., embed=True)):
    try:
        image_bytes = extract_thumbnail_from_stream_url(stream_url)
        return Response(content=image_bytes, media_type="image/jpeg")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/cameras")
def get_all_cameras(db: Session = Depends(get_db)):
    cameras = db.query(Camera).all()
    return jsonable_encoder(cameras)

@router.get("/cameras/{camera_id}")
def get_camera_by_id(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return jsonable_encoder(camera)

@router.post("/cameras")
def create_camera(camera: CameraCreate, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.ip_address == camera.ip_address).first()
    if db_camera:
        raise HTTPException(status_code=400, detail="Camera with this IP already exists")
    
    new_camera = Camera(
        name=camera.name,
        ip_address=camera.ip_address,
        stream_url=camera.stream_url
    )
    db.add(new_camera)
    db.commit()
    db.refresh(new_camera)
    return new_camera

@router.put("/cameras/{camera_id}")
def update_camera(camera_id: int, camera: CameraUpdate, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db_camera.name = camera.name
    db_camera.ip_address = camera.ip_address
    db_camera.stream_url = camera.stream_url

    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.delete("/cameras/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db.delete(db_camera)
    db.commit()
    return {"detail": "Camera deleted successfully"}

@router.get("/video/{camera_id}")
def stream_video(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if camera.violation_type_id == 1:
        return StreamingResponse(stream_violation_video_service1(camera.stream_url, camera.id), media_type="multipart/x-mixed-replace; boundary=frame")
    elif camera.violation_type_id == 2:
        return StreamingResponse(stream_overspeed_service(camera.stream_url, camera.id), media_type="multipart/x-mixed-replace; boundary=frame")
    elif camera.violation_type_id == 3:
        return StreamingResponse(analyze_traffic_video(camera.stream_url, camera.id), media_type="multipart/x-mixed-replace; boundary=frame")
    elif camera.violation_type_id == 4:
        return StreamingResponse(stream_violation_wrongway_video_service1(camera.stream_url, camera.id), media_type="multipart/x-mixed-replace; boundary=frame")
    elif camera.violation_type_id == 5:
        return StreamingResponse(stream_no_helmet_service(camera.stream_url, camera.id), media_type="multipart/x-mixed-replace; boundary=frame")
    elif camera.violation_type_id == 6:
        return StreamingResponse(stream_count_video_service(camera.stream_url, camera.id), media_type="multipart/x-mixed-replace; boundary=frame")
    elif camera.violation_type_id == 7:

        return StreamingResponse(
            detect_potholes_in_video(camera.stream_url, camera.id),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif camera.violation_type_id == 8:
        return StreamingResponse(
            stream_accident_video_service(camera.stream_url, camera.id),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
# Updated Tracking Models
class VehicleInfo(BaseModel):
    brand: Optional[str] = None
    licensePlate: Optional[str] = None
    color: Optional[str] = None


@router.get("/tracking/stream/{camera_id}")
async def stream_tracking_video(
    camera_id: int,
    license_plate: Optional[str] = None,
    brand: Optional[str] = None,
    color: Optional[str] = None,
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    vehicle_info = VehicleInfo(
        licensePlate=license_plate,
        brand=brand,
        color=color
    )

    return StreamingResponse(
        stream_vehicle_tracking_service(camera_id, None, db),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.api_route("/tracking/stream_with_image/{camera_id}", methods=["GET", "POST"])
async def stream_tracking_video_with_image(
    camera_id: int,
    brand: Optional[str] = Form(None),
    license_plate: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    search_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    vehicle_info = VehicleInfo(
        licensePlate=license_plate,
        brand=brand,
        color=color
    )

    # ✅ Read uploaded image or fallback to stored one
    if search_image:
        search_image_bytes = await search_image.read()
        search_images_by_camera[camera.id] = search_image_bytes
    else:
        search_image_bytes = search_images_by_camera.get(camera.id)
        if search_image_bytes is None:
            raise HTTPException(status_code=400, detail="No search image provided or stored for this camera.")

    return StreamingResponse(
        stream_vehicle_tracking_service(camera_id, search_image_bytes, db),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.post("/tracking/start_session")
async def start_tracking_session(
    camera_ids: Optional[List[int]] = Body(None),
    camera_ids_form: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    license_plate: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    search_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    import uuid

    if camera_ids and isinstance(camera_ids, list) and len(camera_ids) > 0:
        final_camera_ids = camera_ids
    elif camera_ids_form:
        try:
            final_camera_ids = json.loads(camera_ids_form)
            if not isinstance(final_camera_ids, list) or not all(isinstance(id, int) for id in final_camera_ids):
                raise ValueError("camera_ids must be a list of integers")
        except json.JSONDecodeError:
            raise HTTPException(status_code=422, detail="Invalid camera_ids format: must be a JSON array of integers")
    else:
        raise HTTPException(status_code=422, detail="camera_ids is required")

    cameras = db.query(Camera).filter(Camera.id.in_(final_camera_ids)).all()
    if len(cameras) != len(final_camera_ids):
        missing_cameras = set(final_camera_ids) - {c.id for c in cameras}
        raise HTTPException(status_code=404, detail=f"Cameras not found: {missing_cameras}")

    session_id = f"TRK-{uuid.uuid4().hex[:8]}"
    vehicle_info = VehicleInfo(
        licensePlate=license_plate,
        brand=brand,
        color=color
    )

    search_method = "image" if search_image else "text"

    # ✅ Read and save image globally
    if search_image:
        search_image_bytes = await search_image.read()
        for cam in cameras:
            search_images_by_camera[cam.id] = search_image_bytes

    camera_streams = []
    for camera in cameras:
        if search_image:
            stream_url = f"/api/tracking/stream_with_image/{camera.id}"
        else:
            stream_url = f"/api/tracking/stream/{camera.id}?license_plate={license_plate or ''}&brand={brand or ''}&color={color or ''}"

        camera_streams.append({
            "cameraId": camera.id,
            "cameraName": camera.name,
            "location": camera.location or "Unknown Location",
            "streamUrl": stream_url,
            "status": "active" if camera.status else "inactive"
        })

    tracking_session = {
        "sessionId": session_id,
        "cameraIds": final_camera_ids,
        "cameraStreams": camera_streams,
        "vehicle": vehicle_info.dict(),
        "startTime": datetime.now().isoformat(),
        "status": "active",
        "searchMethod": search_method,
        "totalCameras": len(cameras)
    }

    return tracking_session

@router.post("/track")
async def track_vehicle_api(
    camera_ids: List[int] = Body(...),
    brand: Optional[str] = Form(None),
    license_plate: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    search_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    try:
        return await start_tracking_session(
            camera_ids=camera_ids,
            brand=brand,
            license_plate=license_plate,
            color=color,
            search_image=search_image,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
