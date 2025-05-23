from fastapi import APIRouter
from .endpoints import camera, user, violation,traffic_density

api_router = APIRouter()
api_router.include_router(camera.router, prefix="/api", tags=["Cameras"])
api_router.include_router(user.router, prefix="/api/auth", tags=["Authentication"])
api_router.include_router(violation.router, prefix="/api/violation", tags=["Violations"])
api_router.include_router(traffic_density.router, prefix="/api/traffic-density", tags=["Traffic Density"])


# api(controller) -> service->crud (repository)->BD