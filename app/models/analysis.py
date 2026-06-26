import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Integer, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type: Mapped[str] = mapped_column(String(10), default="text", nullable=False) # text, file
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Métricas core
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    char_count: Mapped[int] = mapped_column(Integer, nullable=False)
    char_count_no_spaces: Mapped[int] = mapped_column(Integer, nullable=False)
    paragraph_count: Mapped[int] = mapped_column(Integer, nullable=False)
    sentence_count: Mapped[int] = mapped_column(Integer, nullable=False)
    line_count: Mapped[int] = mapped_column(Integer, nullable=False)
    reading_time_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Métricas Premium (Módulo 2)
    readability_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    lexical_density: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    # Relaciones
    user: Mapped[Optional["User"]] = relationship("User", back_populates="analyses")
    keywords: Mapped[List["AnalysisKeyword"]] = relationship("AnalysisKeyword", back_populates="analysis", cascade="all, delete-orphan")
    profile_submission: Mapped[Optional["ProfileSubmission"]] = relationship("ProfileSubmission", back_populates="analysis")

class AnalysisKeyword(Base):
    __tablename__ = "analysis_keywords"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    keyword: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[int] = mapped_column(Integer, nullable=False)
    density_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)

    # Relaciones
    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="keywords")
