from sqlalchemy.orm import Session
from models.model import VehicleTracking
from schemas.vehicle_tracking_schema import VehicleTrackingCreate, VehicleTrackingUpdate

def get_vehicle_tracking(db: Session, tracking_id: int):
    return db.query(VehicleTracking).filter(VehicleTracking.id == tracking_id).first()

def get_vehicle_trackings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(VehicleTracking).offset(skip).limit(limit).all()

def get_vehicle_trackings_by_camera(db: Session, camera_id: int, skip: int = 0, limit: int = 100):
    return db.query(VehicleTracking).filter(VehicleTracking.camera_id == camera_id).offset(skip).limit(limit).all()

def get_vehicle_trackings_by_license_plate(db: Session, license_plate: str, skip: int = 0, limit: int = 100):
    return db.query(VehicleTracking).filter(VehicleTracking.license_plate == license_plate).offset(skip).limit(limit).all()

def create_vehicle_tracking(db: Session, vehicle_tracking: VehicleTrackingCreate):
    db_vehicle_tracking = VehicleTracking(**vehicle_tracking.model_dump())
    db.add(db_vehicle_tracking)
    db.commit()
    db.refresh(db_vehicle_tracking)
    return db_vehicle_tracking

def update_vehicle_tracking(db: Session, tracking_id: int, vehicle_tracking: VehicleTrackingUpdate):
    db_vehicle_tracking = get_vehicle_tracking(db, tracking_id)
    if db_vehicle_tracking:
        update_data = vehicle_tracking.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_vehicle_tracking, key, value)
        db.commit()
        db.refresh(db_vehicle_tracking)
    return db_vehicle_tracking

def delete_vehicle_tracking(db: Session, tracking_id: int):
    db_vehicle_tracking = get_vehicle_tracking(db, tracking_id)
    if db_vehicle_tracking:
        db.delete(db_vehicle_tracking)
        db.commit()
        return True
    return False 