import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.analysis import Analysis
from app.models.teacher_profile import ProfileSubmission, TeacherProfile
from app.models.other_models import AuditLog

router = APIRouter()

# Dependency to check if current user is an institution_admin
def check_admin_access(current_user: User = Depends(get_current_user)):
    if current_user.role != "institution_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. Se requieren privilegios de Administrador Institucional."
        )
    return current_user

# Schemas
class ChangeRolePayload(BaseModel):
    role: str = Field(..., description="Nuevo rol: free_user, premium_user, teacher, institution_admin")

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True

class UsageStatsOut(BaseModel):
    total_users: int
    total_words_processed: int
    total_analyses: int
    total_submissions: int
    users_by_role: dict

class ActivityItemOut(BaseModel):
    id: str
    type: str  # "analysis", "submission", "audit"
    description: str
    timestamp: datetime
    user_email: Optional[str] = None
    detail: Optional[str] = None

@router.get("/users", response_model=List[UserOut], dependencies=[Depends(check_admin_access)])
async def list_users(db: AsyncSession = Depends(get_db)):
    """
    Lista todos los usuarios registrados en el sistema.
    """
    query = select(User).order_by(User.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())

@router.post("/users/{user_id}/role", response_model=UserOut)
async def change_user_role(
    user_id: uuid.UUID,
    payload: ChangeRolePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_admin_access)
):
    """
    Asigna un rol de licencia (free_user, premium_user, teacher, institution_admin) a un usuario.
    Registra esta acción en el historial de auditoría (AuditLog).
    """
    allowed_roles = {"free_user", "premium_user", "teacher", "institution_admin"}
    if payload.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol no válido. Permite: {', '.join(allowed_roles)}"
        )

    # Buscar usuario
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    old_role = user.role
    user.role = payload.role
    db.add(user)

    # Registrar en el log de auditoría
    audit_item = AuditLog(
        user_id=current_user.id,
        action="change_user_role",
        entity_type="user",
        entity_id=user.id,
        ip_address=None
    )
    db.add(audit_item)
    
    await db.commit()
    await db.refresh(user)
    
    return user

@router.get("/usage-stats", response_model=UsageStatsOut, dependencies=[Depends(check_admin_access)])
async def get_usage_stats(db: AsyncSession = Depends(get_db)):
    """
    Obtiene métricas de uso global de la plataforma (monitoreo de uso).
    """
    # 1. Total de usuarios
    users_count_res = await db.execute(select(func.count(User.id)))
    total_users = users_count_res.scalar() or 0

    # 2. Desglose por roles
    roles_query = select(User.role, func.count(User.id)).group_by(User.role)
    roles_res = await db.execute(roles_query)
    users_by_role = {role: count for role, count in roles_res.all()}

    # Asegurar que existan claves básicas en el JSON
    for role in ["free_user", "premium_user", "teacher", "institution_admin"]:
        if role not in users_by_role:
            users_by_role[role] = 0

    # 3. Conteo de palabras procesadas y total de análisis
    analysis_stats_query = select(func.count(Analysis.id), func.sum(Analysis.word_count))
    analysis_stats_res = await db.execute(analysis_stats_query)
    total_analyses, total_words = analysis_stats_res.one()
    total_analyses = total_analyses or 0
    total_words_processed = total_words or 0

    # 4. Total de entregas recibidas de alumnos
    subs_count_res = await db.execute(select(func.count(ProfileSubmission.id)))
    total_submissions = subs_count_res.scalar() or 0

    return UsageStatsOut(
        total_users=total_users,
        total_words_processed=total_words_processed,
        total_analyses=total_analyses,
        total_submissions=total_submissions,
        users_by_role=users_by_role
    )

@router.get("/activity-log", response_model=List[ActivityItemOut], dependencies=[Depends(check_admin_access)])
async def get_activity_log(db: AsyncSession = Depends(get_db)):
    """
    Obtiene un historial unificado de actividad cronológica reciente de la plataforma.
    Incluye análisis ejecutados, envíos de alumnos y cambios de rol.
    """
    activity_items = []

    # 1. Análisis recientes (hasta 15)
    analysis_query = (
        select(Analysis, User.email)
        .outerjoin(User, Analysis.user_id == User.id)
        .order_by(Analysis.created_at.desc())
        .limit(15)
    )
    analysis_res = await db.execute(analysis_query)
    for analysis, email in analysis_res.all():
        activity_items.append(ActivityItemOut(
            id=f"analysis-{analysis.id}",
            type="analysis",
            description=f"Procesó un análisis de texto de {analysis.word_count} palabras ({analysis.char_count} caracteres).",
            timestamp=analysis.created_at,
            user_email=email or "Anónimo / Estudiante",
            detail=f"Tiempo de lectura estimado: {analysis.reading_time_seconds}s"
        ))

    # 2. Entregas recientes de alumnos (hasta 15)
    submissions_query = (
        select(ProfileSubmission, TeacherProfile.profile_name, Analysis.word_count)
        .join(TeacherProfile, ProfileSubmission.profile_id == TeacherProfile.id)
        .join(Analysis, ProfileSubmission.analysis_id == Analysis.id)
        .order_by(ProfileSubmission.submitted_at.desc())
        .limit(15)
    )
    submissions_res = await db.execute(submissions_query)
    for sub, profile_name, word_count in submissions_res.all():
        valid_status = "CUMPLE" if sub.passed_validation else "FUERA DE RANGO"
        activity_items.append(ActivityItemOut(
            id=f"sub-{sub.id}",
            type="submission",
            description=f"Alumno entregó un borrador para la tarea '{profile_name}'. Conteo: {word_count} palabras.",
            timestamp=sub.submitted_at,
            user_email=sub.student_label or "Alumno Anónimo",
            detail=f"Estado de validación: {valid_status}"
        ))

    # 3. Auditoría de cambios de rol (hasta 15)
    audit_query = (
        select(AuditLog, User.email)
        .join(User, AuditLog.user_id == User.id)
        .where(AuditLog.action == "change_user_role")
        .order_by(AuditLog.created_at.desc())
        .limit(15)
    )
    audit_res = await db.execute(audit_query)
    for log, email in audit_res.all():
        # Consultar el usuario afectado para mostrar detalle
        target_user_query = select(User).where(User.id == log.entity_id)
        target_user_res = await db.execute(target_user_query)
        target_user = target_user_res.scalar_one_or_none()
        target_info = f"Usuario: {target_user.email} (Rol actual: {target_user.role})" if target_user else f"ID Usuario: {log.entity_id}"
        
        activity_items.append(ActivityItemOut(
            id=f"audit-{log.id}",
            type="audit",
            description=f"Administrador modificó los permisos o licencia de un usuario.",
            timestamp=log.created_at,
            user_email=email,
            detail=target_info
        ))

    # Ordenar todo unificado de forma descendente por timestamp
    activity_items.sort(key=lambda x: x.timestamp, reverse=True)
    return activity_items[:20]
