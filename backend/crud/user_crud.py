
from sqlalchemy.orm import Session
from models import User
from backend.schemas.user_schema import UserCreate, UserBase

def get_all_cameras(db: Session):
    return db.query(User).all()

def get_user_by_username(db: Session, user_name: str):
    return db.query(User).filter(User.user_name == user_name).first()

def create_user(db: Session, user: UserCreate):
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user




# def update_camera(db: Session, camera_id: int, camera_data: CameraUpdate):
#     db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
#     if not db_camera:
#         return None
#     for key, value in camera_data.dict(exclude_unset=True).items():
#         setattr(db_camera, key, value)
#     db.commit()
#     db.refresh(db_camera)
#     return db_camera

# def delete_camera(db: Session, camera_id: int):
#     db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
#     if not db_camera:
#         return None
#     db.delete(db_camera)
#     db.commit()
#     return db_camera
