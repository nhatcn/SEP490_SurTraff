from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True)
    description = Column(Text)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True)
    password = Column(String(200))
    full_name = Column(String(100))
    avatar = Column(String(200), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    role = relationship("Role", back_populates="users")

class Camera(Base):
    __tablename__ = "camera"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    location = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    stream_url = Column(Text)
    thumbnail = Column(Text)
    status = Column(String(50), default='true')
    created_at = Column(DateTime, default=datetime.utcnow)

class ViolationType(Base):
    __tablename__ = "violation_types"

    id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(100))
    description = Column(Text)

class VehicleType(Base):
    __tablename__ = "vehicle_types"

    id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(100))

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    violation_type_id = Column(Integer, ForeignKey("violation_types.id"))
    vehicle_type_id = Column(Integer, ForeignKey("vehicle_types.id"))
    license_plate = Column(String(20))
    vehicle_color = Column(String(50))
    vehicle_brand = Column(String(100))
    image_url = Column(Text)
    video_url = Column(Text)
    violation_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class Obstacle(Base):
    __tablename__ = "obstacles"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    obstacle_type = Column(String(100))
    image_url = Column(Text)
    location = Column(Text)
    detection_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    description = Column(Text)
    video_url = Column(Text)
    location = Column(Text)
    accident_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrafficDensity(Base):
    __tablename__ = "traffic_density"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    vehicle_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class VehicleTracking(Base):
    __tablename__ = "vehicle_tracking"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    license_plate = Column(String(20))
    vehicle_type_id = Column(Integer, ForeignKey("vehicle_types.id"))
    vehicle_color = Column(String(50))
    vehicle_brand = Column(String(100))
    speed = Column(Float)
    image_url = Column(Text)
    detection_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
