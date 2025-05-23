from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from fastapi.encoders import jsonable_encoder

from services.camera_service import (
    stream_normal_video_service,
    stream_violation_video_service,
    stream_count_video_service,stream_accident_video_service,stream_plate_with_ocr_video_service,
    stream_violation_wrongway_video_service

)
from db.session import get_db
from models.model import Camera
from schemas.camera_schema  import CameraCreate, CameraUpdate

router = APIRouter()


@router.get("/cameras")
def get_all_cameras(db: Session = Depends(get_db)):
    cameras = db.query(Camera).all()
    return jsonable_encoder(cameras)


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

    if camera_id == 2:
        return StreamingResponse(
            stream_violation_video_service(camera.stream_url, camera.id),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif camera_id == 3:
        return StreamingResponse(
            stream_count_video_service(camera.stream_url),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif camera_id == 4:
        return StreamingResponse(
            stream_accident_video_service(camera.stream_url),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif camera_id == 5:
        return StreamingResponse(
            stream_plate_with_ocr_video_service(camera.stream_url),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif camera_id == 6:
        return StreamingResponse(
            stream_violation_wrongway_video_service(camera.stream_url),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    else:
        return StreamingResponse(
            stream_normal_video_service(camera.stream_url),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
