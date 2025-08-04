from fastapi import APIRouter
from .endpoints import camera, user, violation,pothole_detection,chatbot

api_router = APIRouter()
api_router.include_router(camera.router, prefix="/api", tags=["Cameras"])
api_router.include_router(user.router, prefix="/api/auth", tags=["Authentication"])
api_router.include_router(violation.router, prefix="/api/violation", tags=["Violations"])
api_router.include_router(pothole_detection.router, prefix="/api/pothole", tags=["Pothole Detection"])
api_router.include_router(chatbot.router, prefix="/api/query", tags=["Chatbot"])
api_router.include_router(chatbot.router, prefix="/api/feedback", tags=["Feedback"])
# api(controller) -> service->crud (repository)->BD