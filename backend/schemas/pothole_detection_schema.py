from pydantic import BaseModel
from typing import Optional

class PotholeDetectionResponse(BaseModel):
    pothole_count: int