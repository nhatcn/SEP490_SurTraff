from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CameraBase(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    stream_url: str
    status: Optional[str] = "true"

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str]
    location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    stream_url: Optional[str]
    status: Optional[str]

class CameraOut(CameraBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Thay orm_mode bằng from_attributes