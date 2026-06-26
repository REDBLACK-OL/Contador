from typing import Optional, List
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.analysis import AnalysisCreate, AnalysisOut, KeywordOut, FillerWordDetail
from app.core.dependencies import get_optional_current_user, get_current_user
from app.models.user import User
from app.models.analysis import Analysis, AnalysisKeyword
from app.services.text_analysis.analysis_orchestrator import analysis_orchestrator
from app.services.subscription_service import subscription_service
from app.core.exceptions import EmptyOrInvalidTextError, InsufficientPermissionsError
from app.core.config import settings
from app.services.text_analysis.tokenizer_es import tokenize_words, normalize_text

router = APIRouter()

@router.post("/text", response_model=AnalysisOut)
async def analyze_text(
    payload: AnalysisCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Analiza un texto en tiempo real.
    BR-025: Ejecuta los analizadores según el plan vigente.
    BR-011: Valida el límite de 5,000 palabras en plan free.
    BR-010: No persiste los análisis del plan gratuito.
    """
    # Tokenización simple previa para validar límites antes de ejecutar el pipeline pesado (BR-011 fail-fast)
    words = tokenize_words(normalize_text(payload.text))
    word_count = len(words)
    
    user_id = str(current_user.id) if current_user else None
    
    # 1. Validar límite de palabras según plan
    await subscription_service.validate_word_limit(db, user_id, word_count)
    
    # 2. Obtener plan efectivo
    plan_type, _ = await subscription_service.get_effective_plan(db, user_id)
    
    # 3. Correr pipeline de análisis
    results = await analysis_orchestrator.run(payload.text, plan_type)
    
    # 4. Persistir historial si el plan es pagado (BR-010, BR-100)
    if plan_type != "free" and current_user:
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.HISTORIAL_RETENTION_DAYS)
        
        # Crear entidad del análisis
        db_analysis = Analysis(
            user_id=current_user.id,
            source_type="text",
            word_count=results["word_count"],
            char_count=results["char_count"],
            char_count_no_spaces=results["char_count_no_spaces"],
            paragraph_count=results["paragraph_count"],
            sentence_count=results["sentence_count"],
            line_count=results["line_count"],
            reading_time_seconds=results["reading_time_seconds"],
            readability_score=results["readability_score"],
            lexical_density=results["lexical_density"],
            expires_at=expires_at
        )
        db.add(db_analysis)
        await db.flush() # Genera el id de db_analysis
        
        # Asignar ID al resultado para retornar
        results["id"] = db_analysis.id
        results["created_at"] = db_analysis.created_at
        
        # Persistir palabras clave
        for kw_data in results["keywords"]:
            db_kw = AnalysisKeyword(
                analysis_id=db_analysis.id,
                keyword=kw_data["keyword"],
                frequency=kw_data["frequency"],
                density_pct=kw_data["density_pct"]
            )
            db.add(db_kw)
            
        await db.flush()
        
    return results

@router.get("/history", response_model=List[AnalysisOut])
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Obtiene el historial paginado de análisis del usuario.
    Exclusivo para planes de pago (BR-010).
    """
    plan_type, _ = await subscription_service.get_effective_plan(db, str(current_user.id))
    if plan_type == "free":
        raise InsufficientPermissionsError("El historial de análisis es un beneficio exclusivo de los planes Premium.")

    # Buscar análisis del usuario que no hayan expirado
    query = (
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .where(Analysis.expires_at > datetime.now(timezone.utc))
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    analyses = result.scalars().all()
    
    # Para cada análisis, cargar sus palabras clave asociadas
    # SQLAlchemy lazy loading se prefiere evitar en modo asíncrono, cargamos manualmente o con selectinload
    # Para simplificar en esta demo, mapeamos manualmente
    history_out = []
    for analysis in analyses:
        kw_query = select(AnalysisKeyword).where(AnalysisKeyword.analysis_id == analysis.id)
        kw_res = await db.execute(kw_query)
        keywords = kw_res.scalars().all()
        
        # Mapear a salida
        kws_out = [
            KeywordOut(keyword=k.keyword, frequency=k.frequency, density_pct=float(k.density_pct))
            for k in keywords
        ]
        
        history_out.append(
            AnalysisOut(
                id=analysis.id,
                word_count=analysis.word_count,
                char_count=analysis.char_count,
                char_count_no_spaces=analysis.char_count_no_spaces,
                paragraph_count=analysis.paragraph_count,
                sentence_count=analysis.sentence_count,
                line_count=analysis.line_count,
                reading_time_seconds=analysis.reading_time_seconds,
                readability_score=float(analysis.readability_score) if analysis.readability_score else None,
                lexical_density=float(analysis.lexical_density) if analysis.lexical_density else None,
                keywords=kws_out,
                created_at=analysis.created_at
            )
        )
        
    return history_out
