import uuid
from datetime import datetime
from typing import Optional, List
import regex
from pydantic import BaseModel, Field, field_validator
from app.core.exceptions import EmptyOrInvalidTextError

class AnalysisCreate(BaseModel):
    text: str = Field(..., description="Texto original a analizar")

    @field_validator("text")
    @classmethod
    def validate_text_content(cls, v: str) -> str:
        """
        Valida que el texto no esté vacío, no tenga solo espacios
        y que contenga al menos un carácter alfabético (BR-123).
        """
        stripped = v.strip()
        if not stripped:
            raise EmptyOrInvalidTextError("El texto no puede estar vacío o contener solo espacios en blanco.")
        
        # Buscar al menos un carácter alfabético en cualquier idioma (Unicode)
        if not regex.search(r'\p{L}', stripped):
            raise EmptyOrInvalidTextError("El texto debe contener al menos un carácter alfabético (letra).")
            
        return v

class KeywordOut(BaseModel):
    keyword: str
    frequency: int
    density_pct: float

    class Config:
        from_attributes = True

class FillerWordDetail(BaseModel):
    filler_word: str
    frequency: int

    class Config:
        from_attributes = True

class AnalysisOut(BaseModel):
    id: Optional[uuid.UUID] = None
    word_count: int
    char_count: int
    char_count_no_spaces: int
    paragraph_count: int
    sentence_count: int
    line_count: int
    reading_time_seconds: Optional[int] = None
    speaking_time_seconds: Optional[int] = None
    extracted_text: Optional[str] = None
    
    # Campos Premium (opcionales)
    readability_score: Optional[float] = None
    readability_category: Optional[str] = None
    lexical_density: Optional[float] = None
    keywords: List[KeywordOut] = []
    filler_words_count: Optional[int] = None
    filler_words_pct: Optional[float] = None
    filler_words_details: List[FillerWordDetail] = []
    
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
