from fastapi import APIRouter, UploadFile, File
from schemas.traffic_density_schema import TrafficDensityResponse
from services.traffic_density_service import analyze_traffic_video
from tempfile import NamedTemporaryFile
import shutil

router = APIRouter()

@router.post("/video", response_model=TrafficDensityResponse)
async def traffic_density_video(file: UploadFile = File(...)):
    # Lưu file tạm
    with NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name

    result = analyze_traffic_video(temp_path)

    # Xóa file tạm
    return result