from fastapi import APIRouter
from .endpoints import camera, auth

api_router = APIRouter()
api_router.include_router(camera.router, prefix="/api", tags=["Cameras"])
api_router.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
