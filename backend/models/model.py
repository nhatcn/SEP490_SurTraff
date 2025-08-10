from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime

# Role model
class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    users = relationship("User", back_populates="role")

# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=True)
    password = Column(Text, nullable=False)
    full_name = Column(String(100), nullable=True)
    user_name = Column(String(100), unique=True, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    status = Column(Boolean, default=True)
    avatar = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    role = relationship("Role", back_populates="users")
    vehicles = relationship("Vehicle", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

# Camera model
class Camera(Base):
    __tablename__ = "camera"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=True)
    location = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    stream_url = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    thumbnail = Column(Text, nullable=True)
    max_speed = Column(Integer, default=0)
    violation_type_id = Column(Integer, ForeignKey("violation_types.id"), nullable=True)

    violation_type = relationship("ViolationType", back_populates="cameras")
    accidents = relationship("Accident", back_populates="camera")
    obstacles = relationship("Obstacle", back_populates="camera")
    traffic_densities = relationship("TrafficDensity", back_populates="camera")
    vehicle_trackings = relationship("VehicleTracking", back_populates="camera")
    violations = relationship("Violation", back_populates="camera")
    zones = relationship("Zone", back_populates="camera")

# ViolationType model
class ViolationType(Base):
    __tablename__ = "violation_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    cameras = relationship("Camera", back_populates="violation_type")
    violation_details = relationship("ViolationDetail", back_populates="violation_type")


class VehicleType(Base):
    __tablename__ = "vehicle_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_name = Column(String(50), unique=True, nullable=False)

    vehicles = relationship("Vehicle", back_populates="vehicle_type")
    violations = relationship("Violation", back_populates="vehicle_type")
    vehicle_trackings = relationship("VehicleTracking", back_populates="vehicle_type")

# Vehicle model
class Vehicle(Base):
    __tablename__ = "vehicle"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=True)
    license_plate = Column(String(20), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    vehicle_type_id = Column(Integer, ForeignKey("vehicle_types.id"), nullable=True)
    color = Column(String(30), nullable=True)
    brand = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="vehicles")
    vehicle_type = relationship("VehicleType", back_populates="vehicles")
    accidents = relationship("Accident", back_populates="vehicle")
    violations = relationship("Violation", back_populates="vehicle")
    notifications = relationship("Notification", back_populates="vehicle")

# Violation model
class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(Integer, ForeignKey("camera.id"), nullable=True)
    vehicle_type_id = Column(Integer, ForeignKey("vehicle_types.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicle.id"), nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=func.now())

    camera = relationship("Camera", back_populates="violations")
    vehicle_type = relationship("VehicleType", back_populates="violations")
    vehicle = relationship("Vehicle", back_populates="violations")
    violation_details = relationship("ViolationDetail", back_populates="violation")
    notifications = relationship("Notification", back_populates="violation")

# ViolationDetail model
class ViolationDetail(Base):
    __tablename__="violation_detail"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    violation_type_id = Column(Integer, ForeignKey("violation_types.id"), nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    violation_time = Column(DateTime, nullable=True)
    speed = Column(Float, nullable=True)
    additional_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    violation = relationship("Violation", back_populates="violation_details")
    violation_type = relationship("ViolationType", back_populates="violation_details")

# Obstacle model
class Obstacle(Base):
    __tablename__ = "obstacles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(Integer, ForeignKey("camera.id"), nullable=True)
    obstacle_type = Column(String(100), nullable=True)
    image_url = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    detection_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    camera = relationship("Camera", back_populates="obstacles")

# Accident model
class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(Integer, ForeignKey("camera.id"), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    accident_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    vehicle_id = Column(Integer, ForeignKey("vehicle.id"), nullable=True)
    status = Column(String(50), default="pending")

    camera = relationship("Camera", back_populates="accidents")
    vehicle = relationship("Vehicle", back_populates="accidents")
    notifications = relationship("Notification", back_populates="accident")

# TrafficDensity model
class TrafficDensity(Base):
    __tablename__ = "traffic_density"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(Integer, ForeignKey("camera.id"), nullable=True)
    vehicle_count = Column(Integer, nullable=True)
    detection_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    camera = relationship("Camera", back_populates="traffic_densities")

# VehicleTracking model
class VehicleTracking(Base):
    __tablename__ = "vehicle_tracking"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(Integer, ForeignKey("camera.id"), nullable=True)
    license_plate = Column(String(20), nullable=True)
    vehicle_type_id = Column(Integer, ForeignKey("vehicle_types.id"), nullable=True)
    vehicle_color = Column(String(30), nullable=True)
    vehicle_brand = Column(String(50), nullable=True)
    speed = Column(Float, nullable=True)
    location = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    detection_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    camera = relationship("Camera", back_populates="vehicle_trackings")
    vehicle_type = relationship("VehicleType", back_populates="vehicle_trackings")

# Notification model
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicle.id"), nullable=True)
    accident_id = Column(Integer, ForeignKey("accidents.id"), nullable=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=True)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)

    user = relationship("User", back_populates="notifications")
    vehicle = relationship("Vehicle", back_populates="notifications")
    accident = relationship("Accident", back_populates="notifications")
    violation = relationship("Violation", back_populates="notifications")


    
# Zone model
class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=True)
    camera_id = Column(Integer, ForeignKey("camera.id"), nullable=True)
    zone_type = Column(String(20), nullable=False)
    coordinates = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    camera = relationship("Camera", back_populates="zones")
    lane_movements_from = relationship(
        "LaneMovement",
        foreign_keys="[LaneMovement.from_lane_zone_id]",
        back_populates="from_lane_zone"
    )
    lane_movements_to = relationship(
        "LaneMovement",
        foreign_keys="[LaneMovement.to_lane_zone_id]",
        back_populates="to_lane_zone"
    )
    light_lanes_light = relationship(
        "ZoneLightLane",
        foreign_keys="[ZoneLightLane.light_zone_id]",
        back_populates="light_zone"
    )
    light_lanes_lane = relationship(
        "ZoneLightLane",
        foreign_keys="[ZoneLightLane.lane_zone_id]",
        back_populates="lane_zone"
    )



# LaneMovement model
class LaneMovement(Base):
    __tablename__ = "lane_movements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    from_lane_zone_id = Column(Integer, ForeignKey("zones.id"), primary_key=True)
    to_lane_zone_id = Column(Integer, ForeignKey("zones.id"), primary_key=True)

    from_lane_zone = relationship(
        "Zone",
        foreign_keys=[from_lane_zone_id],
        back_populates="lane_movements_from"
    )
    to_lane_zone = relationship(
        "Zone",
        foreign_keys=[to_lane_zone_id],
        back_populates="lane_movements_to"
    )

# ZoneLightLane model
class ZoneLightLane(Base):
    __tablename__ = "zone_light_lanes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    light_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    lane_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)

    light_zone = relationship(
        "Zone",
        foreign_keys=[light_zone_id],
        back_populates="light_lanes_light"
    )
    lane_zone = relationship(
        "Zone",
        foreign_keys=[lane_zone_id],
        back_populates="light_lanes_lane"
    )