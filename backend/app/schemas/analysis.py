from pydantic import BaseModel
from datetime import datetime

class AnalysisBase(BaseModel):
    text_preview: str
    word_count: int
    character_count: int
    readability_score: float
    ai_probability: float | None = None
    plagiarism_percentage: float | None = None

class AnalysisCreate(AnalysisBase):
    pass

class AnalysisOut(AnalysisBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class UserVersionCreate(BaseModel):
    text: str

class UserVersionOut(BaseModel):
    id: int
    user_id: int
    text: str
    created_at: datetime
    model_config = {"from_attributes": True}
