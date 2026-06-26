from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import api_router
from app.models.base import Base
from app.db.session import engine

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar middleware de CORS (Cruce de Orígenes)
# BR-122: Asegura que el backend solo acepte orígenes permitidos
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Registrar los manejadores globales de excepciones del dominio
register_exception_handlers(app)

# Incluir las rutas del API v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Middleware de depuración para inspeccionar peticiones OPTIONS y CORS
from fastapi import Request
@app.middleware("http")
async def log_options_requests(request: Request, call_next):
    if request.method == "OPTIONS":
        print("--- CAPTURED OPTIONS REQUEST ---")
        print("Method:", request.method)
        print("URL:", request.url)
        print("Headers:", dict(request.headers))
        print("--------------------------------")
    response = await call_next(request)
    return response

@app.on_event("startup")
async def on_startup():
    """
    Evento de inicio de FastAPI.
    Crea automáticamente las tablas en base de datos si no existen (facilita desarrollo local).
    """
    print("CORS Origins definidos en config.py:", settings.BACKEND_CORS_ORIGINS)
    print("CORS Origins formateados para el middleware:", [str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS])
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/healthz", tags=["Monitoreo"])
async def health_check():
    """Liveness check para verificar que el servicio está corriendo."""
    return {"status": "healthy"}

@app.get("/readyz", tags=["Monitoreo"])
async def readiness_check():
    """Readiness check para verificar conexiones externas activas."""
    # En un sistema real se valida ping a Postgres y Redis.
    return {"status": "ready"}
