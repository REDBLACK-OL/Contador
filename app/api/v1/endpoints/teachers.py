import secrets
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.teacher import TeacherProfileCreate, TeacherProfileOut, StudentSubmissionCreate, SubmissionOut
from app.core.dependencies import get_current_user, get_optional_current_user
from app.models.user import User
from app.models.teacher_profile import TeacherProfile, ProfileSubmission
from app.models.analysis import Analysis
from app.services.subscription_service import subscription_service
from app.services.text_analysis.analysis_orchestrator import analysis_orchestrator
from app.services.text_analysis.tokenizer_es import tokenize_words, normalize_text
from app.core.exceptions import InsufficientPermissionsError, ProfileNotFoundOrInactive

router = APIRouter()

@router.post("/profiles", response_model=TeacherProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: TeacherProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea un nuevo perfil docente con rangos de palabras.
    BR-070: Solo disponible para usuarios Premium o Institucionales.
    BR-072: Genera un share_token único y opaco para el enlace compartible.
    """
    plan_type, _ = await subscription_service.get_effective_plan(db, str(current_user.id))
    if plan_type == "free":
        raise InsufficientPermissionsError("La creación de perfiles docentes requiere de una suscripción Premium.")

    # Generar share_token seguro
    share_token = secrets.token_urlsafe(16)

    db_profile = TeacherProfile(
        user_id=current_user.id,
        profile_name=payload.profile_name,
        min_words=payload.min_words,
        max_words=payload.max_words,
        expires_at=payload.expires_at,
        share_token=share_token,
        is_active=True
    )
    db.add(db_profile)
    await db.flush()
    return db_profile

@router.get("/profiles", response_model=List[TeacherProfileOut])
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los perfiles creados por el docente autenticado.
    """
    query = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id).order_by(TeacherProfile.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())

@router.get("/profiles/by-token/{share_token}", response_model=TeacherProfileOut)
async def get_profile_by_token(
    share_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los datos de un perfil docente de forma pública a través de su share_token.
    BR-072: El acceso se realiza mediante el token opaco, previniendo IDOR.
    """
    query = select(TeacherProfile).where(TeacherProfile.share_token == share_token)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    
    if not profile or not profile.is_active:
        raise ProfileNotFoundOrInactive()
        
    return profile

@router.post("/profiles/by-token/{share_token}/submit", response_model=SubmissionOut)
async def submit_to_profile(
    share_token: str,
    payload: StudentSubmissionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Valida y registra un envío de alumno contra un perfil docente.
    No requiere autenticación (BR-074).
    BR-071: Evalúa si cumple con el min_words y max_words del perfil.
    BR-100/BR-075: No se guarda el texto original, solo las métricas del análisis.
    """
    # 1. Obtener perfil
    query = select(TeacherProfile).where(TeacherProfile.share_token == share_token)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    
    if not profile or not profile.is_active:
        raise ProfileNotFoundOrInactive()

    # Validar plazo de entrega (deadline)
    if profile.expires_at is not None:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        expires_at_tz = profile.expires_at
        if expires_at_tz.tzinfo is None:
            expires_at_tz = expires_at_tz.replace(tzinfo=timezone.utc)
        if now > expires_at_tz:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El plazo para entregar este trabajo ha vencido."
            )

    # 2. Correr análisis básico en español (sin guardar todavía)
    norm_text = normalize_text(payload.text)
    words = tokenize_words(norm_text)
    word_count = len(words)

    # 3. Validar cumplimiento de límites
    passed = True
    if profile.min_words is not None and word_count < profile.min_words:
        passed = False
    if profile.max_words is not None and word_count > profile.max_words:
        passed = False

    # 4. Registrar análisis en base de datos (conteo básico, sin usuario porque el alumno es anónimo)
    # Por BR-100: No se persiste el texto, solo métricas
    results = await analysis_orchestrator.run(payload.text, plan_type="free") # Conteo básico
    
    db_analysis = Analysis(
        user_id=None,
        source_type="text",
        word_count=results["word_count"],
        char_count=results["char_count"],
        char_count_no_spaces=results["char_count_no_spaces"],
        paragraph_count=results["paragraph_count"],
        sentence_count=results["sentence_count"],
        line_count=results["line_count"],
        reading_time_seconds=results["reading_time_seconds"]
    )
    db.add(db_analysis)
    await db.flush()

    # 5. Crear el registro del envío del alumno
    db_submission = ProfileSubmission(
        profile_id=profile.id,
        analysis_id=db_analysis.id,
        student_label=payload.student_label,
        passed_validation=passed
    )
    db.add(db_submission)
    await db.flush()

    return SubmissionOut(
        id=db_submission.id,
        profile_id=profile.id,
        passed_validation=passed,
        word_count=word_count,
        submitted_at=db_submission.submitted_at
    )

@router.get("/profiles/{profile_id}/submissions", response_model=List[dict])
async def list_profile_submissions(
    profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los envíos de alumnos correspondientes a una tarea del docente.
    """
    # Validar propiedad del perfil
    prof_query = select(TeacherProfile).where(TeacherProfile.id == profile_id)
    prof_res = await db.execute(prof_query)
    profile = prof_res.scalar_one_or_none()
    
    if not profile or profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para ver las entregas de este perfil.")

    # Obtener entregas
    sub_query = (
        select(ProfileSubmission, Analysis)
        .join(Analysis, ProfileSubmission.analysis_id == Analysis.id)
        .where(ProfileSubmission.profile_id == profile_id)
        .order_by(ProfileSubmission.submitted_at.desc())
    )
    result = await db.execute(sub_query)
    submissions_data = result.all()

    out = []
    for sub, ana in submissions_data:
        out.append({
            "id": sub.id,
            "student_label": sub.student_label,
            "passed_validation": sub.passed_validation,
            "word_count": ana.word_count,
            "submitted_at": sub.submitted_at
        })
    return out
