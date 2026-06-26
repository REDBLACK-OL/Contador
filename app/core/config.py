from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def parse_cors(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore"
    )

    ENV: str = "development"
    PROJECT_NAME: str = "WordCount Pro"
    API_V1_STR: str = "/api/v1"
    
    # Base de Datos y Redis
    DATABASE_URL: str
    REDIS_URL: str

    # Seguridad y JWT
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors)
    ] = [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:3000", "http://127.0.0.1:3000"
    ]

    # Stripe y Culqi sandbox
    CULQI_PUBLIC_KEY: str = "pk_test_placeholder"
    CULQI_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_API_KEY: str = "sk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"

    # SMTP (Emails transaccionales)
    SMTP_HOST: str = "smtp.mailtrap.io"
    SMTP_PORT: int = 2525
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@wordcountpro.pe"
    EMAILS_FROM_NAME: str = "WordCount Pro"

    # Lógica del Negocio
    FREE_PLAN_WORD_LIMIT: int = 5000
    READING_WORDS_PER_MINUTE: int = 200
    HISTORIAL_RETENTION_DAYS: int = 90
    REFERRAL_REWARD_DAYS: int = 15

settings = Settings()
