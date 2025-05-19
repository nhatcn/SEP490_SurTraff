from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ViolationTypeBase(BaseModel):
    type_name: str
    description: Optional[str] = None

class ViolationTypeCreate(ViolationTypeBase):
    pass

class ViolationTypeUpdate(BaseModel):
    type_name: Optional[str] = None
    description: Optional[str] = None

class ViolationTypeOut(ViolationTypeBase):
    id: int

    class Config:
        from_attributes = True 