from fastapi import APIRouter
from app.api.v1.endpoints import auth, analysis, files, payments, teachers, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Análisis Textual"])
api_router.include_router(files.router, prefix="/files", tags=["Carga de Archivos"])
api_router.include_router(payments.router, prefix="/payments", tags=["Pasarela de Pagos"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["Módulo Docente"])
api_router.include_router(admin.router, prefix="/admin", tags=["Módulo Administrador"])
