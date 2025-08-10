from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CameraBase(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    stream_url: str
    max_speed: Optional[int] = 0
    status: Optional[bool] = True
    violation_type_id: Optional[int] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stream_url: Optional[str] = None
    max_speed: Optional[int] = None
    status: Optional[bool] = None
    violation_type_id: Optional[int] = None

class CameraOut(CameraBase):
    id: int
    created_at: datetime
    thumbnail: Optional[str] = None

    class Config:
        from_attributes = True