from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from models.model import User
from schemas.user_schema import TokenData, UserCreate
from typing import Optional
from fastapi import HTTPException, status
import random
import string
from utils.email_utils import send_email_with_password
SECRET_KEY = "your-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.user_name == username).first()
    if not user or not verify_password(password, user.password):
        return None
    return user
def register_user(db: Session, user_data: UserCreate):
   
    existing_user = db.query(User).filter(
        (User.user_name == user_data.user_name)
      
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    user = User(
        user_name=user_data.user_name,
        email=user_data.email,
        password=hashed_password,
        full_name=user_data.full_name,
        avatar=user_data.avatar,
        role_id=user_data.role_id,
        status=user_data.status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def generate_random_password(length: int = 3):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def forgot_password(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_password = generate_random_password()
    hashed_password = get_password_hash(new_password)

    user.password = hashed_password
    db.commit()

    send_email_with_password(user.email, new_password)
    return {"msg": "New password has been sent to your email"}