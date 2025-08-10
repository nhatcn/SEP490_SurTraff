from pydantic import BaseModel
from typing import Optional
from pydantic import  EmailStr
from datetime import datetime


class UserBase(BaseModel):
    user_name: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[bool] = True
    role_id: Optional[int] = None

class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    user_name: Optional[str]
    email: Optional[EmailStr]
    full_name: Optional[str]
    avatar: Optional[str]
    status: Optional[bool] = True
    role_id: Optional[int]
    password: Optional[str] 


class UserOut(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_name: Optional[str] = None 
