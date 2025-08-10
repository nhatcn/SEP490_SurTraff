from sqlalchemy.orm import Session
from models.model import Violation
from schemas.violation_schema import ViolationCreate, ViolationUpdate

def get_all_violation(db: Session):
    return db.query(Violation).all()

def get_violation(db: Session, violation_id: int):
    return db.query(Violation).filter(Violation.id == violation_id).first()

def get_violations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Violation).offset(skip).limit(limit).all()

def get_violations_by_camera(db: Session, camera_id: int, skip: int = 0, limit: int = 100):
    return db.query(Violation).filter(Violation.camera_id == camera_id).offset(skip).limit(limit).all()

def create_violation(db: Session, violation: ViolationCreate):
    db_violation = Violation(**violation.model_dump())
    db.add(db_violation)
    db.commit()
    db.refresh(db_violation)
    return db_violation

def update_violation(db: Session, violation_id: int, violation: ViolationUpdate):
    db_violation = get_violation(db, violation_id)
    if db_violation:
        update_data = violation.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_violation, key, value)
        db.commit()
        db.refresh(db_violation)
    return db_violation

def delete_violation(db: Session, violation_id: int):
    db_violation = get_violation(db, violation_id)
    if db_violation:
        db.delete(db_violation)
        db.commit()
        return True
    return False 