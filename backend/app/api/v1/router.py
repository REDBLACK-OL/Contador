from fastapi import APIRouter
from app.api.v1.endpoints import auth, analysis

api_router = APIRouter()

# Incluir sub-rutas de la API v1
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(analysis.router, prefix="/analyze", tags=["Análisis y Métricas"])
