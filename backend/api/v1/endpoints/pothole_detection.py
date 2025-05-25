from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.pothole_detection_schema import PotholeDetectionResponse
from services.pothole_detection_service import detect_potholes_in_video

router = APIRouter()

@router.post("/pothole-detection", response_model=PotholeDetectionResponse)
async def pothole_detection_api(file: UploadFile = File(...)):
    if not file.filename.endswith(('.mp4', '.avi', '.mov')):
        raise HTTPException(status_code=400, detail="File must be a video (.mp4, .avi, .mov)")
    count = detect_potholes_in_video(file)
    return PotholeDetectionResponse(pothole_count=count)