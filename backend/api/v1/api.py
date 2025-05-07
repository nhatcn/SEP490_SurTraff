from fastapi import APIRouter
from .endpoints import camera

api_router = APIRouter()
api_router.include_router(camera.router, prefix="/api", tags=["Cameras"])
