# crud/camera.py
from sqlalchemy.orm import Session
from models.model import Camera
from schemas.camera_schema import CameraCreate, CameraUpdate

def get_all_cameras(db: Session):
    return db.query(Camera).all()

def get_camera_by_id(db: Session, camera_id: int):
    return db.query(Camera).filter(Camera.id == camera_id).first()

def create_camera(db: Session, camera: CameraCreate):
    db_camera = Camera(**camera.model_dump())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

def update_camera(db: Session, camera_id: int, camera_data: CameraUpdate):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        return None
    for key, value in camera_data.dict(exclude_unset=True).items():
        setattr(db_camera, key, value)
    db.commit()
    db.refresh(db_camera)
    return db_camera

def delete_camera(db: Session, camera_id: int):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        return None
    db.delete(db_camera)
    db.commit()
    return db_camera
