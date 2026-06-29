from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer

from app.db.session import get_db
from app.models.user import User
from app.models.analysis import Analysis, UserVersion
from app.schemas.analysis import AnalysisOut, UserVersionOut, UserVersionCreate
from app.services.text_analysis.basic_counter import calculate_text_metrics
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    """
    Dependency to optionally retrieve the logged-in user from JWT.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
        
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_current_user(
    current_user: User | None = Depends(get_current_user_optional)
) -> User:
    """
    Dependency to require authentication.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación no proporcionadas o inválidas"
        )
    return current_user


@router.post("/analyze")
async def analyze_text_endpoint(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional)
):
    text = payload.get("text", "")
    metrics = calculate_text_metrics(text)
    
    # REGLA BR-011: Límite de 5,000 palabras para usuarios gratuitos/anónimos
    is_premium = user is not None and user.role in ["premium_user", "teacher", "super_admin"]
    if metrics["word_count"] > 5000 and not is_premium:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "PlanLimitExceededError",
                "message": "El plan gratuito tiene un límite de 5,000 palabras por análisis. Por favor adquiere el plan Premium.",
                "limit": 5000,
                "current": metrics["word_count"]
            }
        )
        
    # REGLA BR-010: Guardar reporte/métrica solo si el plan es pagado
    if is_premium:
        preview = text[:197] + "..." if len(text) > 197 else text
        db_analysis = Analysis(
            user_id=user.id,
            text_preview=preview,
            word_count=metrics["word_count"],
            character_count=metrics["character_count"],
            readability_score=metrics["readability_score"],
            ai_probability=12.5, # Simulación del detector
            plagiarism_percentage=0.0 # Simulación del detector
        )
        db.add(db_analysis)
        await db.commit()
        
    return metrics


@router.get("/history")
async def get_user_history_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Obtiene el historial persistido del usuario premium (Regla BR-010).
    """
    if user.role not in ["premium_user", "teacher", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El historial de análisis es un beneficio exclusivo del Plan Premium"
        )
        
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc())
    )
    return result.scalars().all()


@router.post("/autosave", response_model=UserVersionOut)
async def autosave_text_endpoint(
    draft: UserVersionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Guarda borradores temporales e históricos (Regla BR-039).
    Mantiene solo los últimos 5 borradores guardados.
    """
    # Guardar nueva versión
    new_version = UserVersion(
        user_id=user.id,
        text=draft.text
    )
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)
    
    # Mantener últimos 5 borradores (Regla BR-039)
    result = await db.execute(
        select(UserVersion)
        .where(UserVersion.user_id == user.id)
        .order_by(UserVersion.created_at.desc())
    )
    versions = result.scalars().all()
    if len(versions) > 5:
        # Borrar los más antiguos
        old_ids = [v.id for v in versions[5:]]
        await db.execute(delete(UserVersion).where(UserVersion.id.in_(old_ids)))
        await db.commit()
        
    return new_version


@router.get("/versions")
async def get_user_draft_versions_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Obtiene las versiones del borrador guardadas para el editor.
    """
    result = await db.execute(
        select(UserVersion)
        .where(UserVersion.user_id == user.id)
        .order_by(UserVersion.created_at.desc())
    )
    return result.scalars().all()
