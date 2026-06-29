import asyncio
import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Registrar modelos para la creacion de tablas
from app.models.user import User
from app.models.analysis import Analysis, UserVersion

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Motor de analisis textual inteligente adaptado al idioma espanol",
    version="1.0.0"
)

# CORS abierto para el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir enrutador global de la version 1
app.include_router(api_router, prefix="/api/v1")


async def create_db_if_not_exists():
    """Crea la base de datos 'wordcount_pro' si no existe."""
    db_url = settings.DATABASE_URL
    raw_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    parts = raw_url.split("/")
    db_name = parts[-1]
    base_url = "/".join(parts[:-1]) + "/postgres"

    try:
        conn = await asyncpg.connect(base_url)
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"[OK] Base de datos '{db_name}' creada exitosamente.")
        else:
            print(f"[OK] Base de datos '{db_name}' ya existe.")
        await conn.close()
    except Exception as e:
        print(f"[WARN] No se pudo verificar/crear la BD: {e}")


@app.on_event("startup")
async def startup():
    """Al iniciar: crear BD si no existe, luego crear tablas."""
    print("\n[WordCount Pro] Iniciando API...")
    
    await create_db_if_not_exists()
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Tablas verificadas/creadas correctamente.")
    except Exception as e:
        print(f"[WARN] Error al crear tablas: {e}")
    
    print("[OK] WordCount Pro API lista en http://localhost:8000")
    print("[OK] Documentacion: http://localhost:8000/docs\n")


@app.get("/")
def read_root():
    return {
        "message": "WordCount Pro API activa",
        "docs": "http://localhost:8000/docs",
        "version": "1.0.0"
    }
