from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt

# --- PARCHE DE COMPATIBILIDAD BCRYPT Y PASSLIB EN PYTHON 3.13 ---
import bcrypt
orig_hashpw = bcrypt.hashpw
def patched_hashpw(password, salt):
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    return orig_hashpw(password_bytes, salt)
bcrypt.hashpw = patched_hashpw
# -----------------------------------------------------------------

from passlib.context import CryptContext
from app.core.config import settings

# Configurar el contexto de hasheo con bcrypt y factor de costo 12 (BR-041)
pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12, deprecated="auto")

ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, secret: str) -> Optional[str]:
    """
    Decodifica y valida un token. Retorna el sujeto (sub) si es válido, o None si expira o falla la firma.
    """
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None
