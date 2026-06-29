from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "WordCount Pro"
    SECRET_KEY: str = "wcp_super_secret_key_2024_wordcount_pro_peru"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Base de Datos asíncrona (PostgreSQL con asyncpg)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:omarchino123@localhost:5432/wordcount_pro"
    
    # Caché y Limitador (Redis) - opcional
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = {"env_file": ".env", "case_sensitive": True}

settings = Settings()
