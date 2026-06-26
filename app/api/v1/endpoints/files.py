from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.analysis import AnalysisOut, KeywordOut
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.analysis import Analysis, AnalysisKeyword
from app.services.file_parser import parse_file
from app.services.subscription_service import subscription_service
from app.services.text_analysis.analysis_orchestrator import analysis_orchestrator
from app.core.exceptions import InsufficientPermissionsError, PlanLimitExceededError
from app.core.config import settings

router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB (BR-051 / BR-121)

@router.post("/upload", response_model=AnalysisOut)
async def upload_file_analysis(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sube y analiza un archivo (.txt, .docx, .pdf).
    BR-050: La carga de archivos es una capacidad exclusiva de planes Premium/Institucional.
    BR-051: Valida el tamaño máximo (10 MB) y el MIME type real del contenido.
    BR-052: El archivo original NUNCA se almacena de forma permanente; solo se procesa en memoria.
    """
    # 1. Validar que el usuario tenga un plan Premium activo
    plan_type, _ = await subscription_service.get_effective_plan(db, str(current_user.id))
    if plan_type == "free":
        raise InsufficientPermissionsError("La carga y análisis de archivos es un beneficio exclusivo de los planes Premium.")

    # 2. Leer contenido y validar tamaño del archivo (BR-121)
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE_BYTES:
        raise PlanLimitExceededError(
            f"El tamaño del archivo excede el límite permitido de 10 MB (enviado: {round(file_size / (1024 * 1024), 2)} MB)."
        )

    # 3. Extraer texto usando los parseadores
    extracted_text = parse_file(content, file.filename, file.content_type)

    # 4. Analizar texto usando el motor
    results = await analysis_orchestrator.run(extracted_text, plan_type)

    # 5. Guardar en base de datos (por BR-052/BR-100, se guardan solo métricas, no el archivo original)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.HISTORIAL_RETENTION_DAYS)
    
    db_analysis = Analysis(
        user_id=current_user.id,
        source_type="file",
        original_filename=file.filename,
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
    await db.flush()

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

    results["extracted_text"] = extracted_text
    return results
