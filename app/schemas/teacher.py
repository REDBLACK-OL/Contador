import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

class TeacherProfileCreate(BaseModel):
    profile_name: str = Field(..., max_length=150, description="Nombre del perfil/tarea")
    min_words: Optional[int] = Field(None, ge=0, description="Cantidad mínima de palabras")
    max_words: Optional[int] = Field(None, ge=0, description="Cantidad máxima de palabras")
    expires_at: Optional[datetime] = Field(None, description="Fecha y hora límite de entrega")

    @field_validator("max_words")
    @classmethod
    def validate_word_range(cls, max_words: Optional[int], info) -> Optional[int]:
        """BR-071: Valida que min_words <= max_words si ambos están presentes."""
        min_words = info.data.get("min_words")
        if min_words is not None and max_words is not None:
            if min_words > max_words:
                raise ValueError("La cantidad mínima de palabras no puede ser mayor que la cantidad máxima.")
        return max_words

class TeacherProfileOut(BaseModel):
    id: uuid.UUID
    profile_name: str
    min_words: Optional[int] = None
    max_words: Optional[int] = None
    expires_at: Optional[datetime] = None
    share_token: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StudentSubmissionCreate(BaseModel):
    text: str = Field(..., description="Texto del alumno a validar")
    student_label: Optional[str] = Field(None, max_length=150, description="Identificación opcional (nombre, código)")

class SubmissionOut(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    passed_validation: bool
    word_count: int
    submitted_at: datetime

    class Config:
        from_attributes = True
