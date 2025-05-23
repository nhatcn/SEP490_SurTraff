from pydantic import BaseModel
from typing import Optional

class LaneStatus(BaseModel):
    stop_count: int
    status: str

class TrafficDensityResponse(BaseModel):
    frames: int
    left_lane: LaneStatus
    right_lane: LaneStatus