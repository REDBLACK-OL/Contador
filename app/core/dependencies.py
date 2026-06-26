from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import user_repository

# Esquema OAuth2 con Bearer Token
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False  # Permite autenticación opcional
)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Obtiene el usuario autenticado a partir del JWT.
    Lanza una excepción HTTP 401 si no es válido.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de sesión inválidas o expiradas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    user_id = security.verify_token(token, settings.JWT_SECRET)
    if not user_id:
        raise credentials_exception

    user = await user_repository.get(db, user_id)
    if not user or not user.is_active:
        raise credentials_exception

    return user

async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    Obtiene el usuario autenticado de forma opcional.
    Si no hay token o es inválido, devuelve None sin lanzar error.
    """
    if not token:
        return None
    try:
        user_id = security.verify_token(token, settings.JWT_SECRET)
        if not user_id:
            return None
        user = await user_repository.get(db, user_id)
        if not user or not user.is_active:
            return None
        return user
    except Exception:
        return None

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        """
        Verifica si el usuario tiene uno de los roles permitidos.
        """
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción."
            )
        return current_user
