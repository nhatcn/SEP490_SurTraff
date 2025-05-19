from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ViolationBase(BaseModel):
    camera_id: int
    violation_type_id: int
    vehicle_type_id: Optional[int] = None
    license_plate: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_brand: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    violation_time: datetime


class ViolationCreate(ViolationBase):
    pass

class ViolationUpdate(BaseModel):
    camera_id: Optional[int] = None
    violation_type_id: Optional[int] = None
    vehicle_type_id: Optional[int] = None
    license_plate: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_brand: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    violation_time: Optional[datetime] = None

class ViolationOut(ViolationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True 