from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import UserRegister, UserLogin, TokenOut, RefreshRequest
from app.schemas.user import UserOut
from app.services.auth_service import auth_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Registra un nuevo usuario en el sistema.
    Valida políticas de correo y contraseña (BR-047, BR-048).
    """
    user = await auth_service.register(
        db=db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name
    )
    return user

@router.post("/login", response_model=TokenOut)
async def login_user(
    payload: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Autentica un usuario y devuelve access_token y refresh_token.
    BR-042: El refresh_token se hashea en la base de datos para mayor seguridad.
    """
    # SlowAPI se puede integrar en el main.py de forma global para rate limiting.
    # Por ahora autenticamos al usuario
    user = await auth_service.authenticate(
        db=db,
        email=payload.email,
        password=payload.password
    )
    
    # Extraer información básica de cabecera como device_info
    device_info = request.headers.get("user-agent", "Unknown Device")
    
    access_token, refresh_token = await auth_service.create_session(
        db=db,
        user_id=user.id,
        device_info=device_info
    )
    return TokenOut(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenOut)
async def refresh_token(
    payload: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Renueva una sesión rotando el refresh token.
    BR-043: Detecta la reutilización de tokens para evitar suplantaciones de sesión.
    """
    device_info = request.headers.get("user-agent", "Unknown Device")
    access_token, refresh_token = await auth_service.refresh(
        db=db,
        refresh_token=payload.refresh_token,
        device_info=device_info
    )
    return TokenOut(access_token=access_token, refresh_token=refresh_token)

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Cierra sesión invalidando el refresh token enviado.
    """
    await auth_service.revoke_session(db=db, refresh_token=payload.refresh_token)
    return {"success": True, "message": "Sesión cerrada correctamente."}

@router.post("/logout-all", status_code=status.HTTP_200_OK)
async def logout_all_devices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cierra todas las sesiones activas del usuario (revocación en cascada).
    BR-045: Logout en todos los dispositivos.
    """
    await auth_service.revoke_all_sessions(db=db, user_id=current_user.id)
    return {"success": True, "message": "Se han cerrado todas las sesiones de forma exitosa."}

@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Retorna el perfil del usuario autenticado (incluyendo su rol actual en base de datos).
    """
    return current_user
