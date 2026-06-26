import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)
    profile_name: Mapped[str] = mapped_column(String(150), nullable=False)
    min_words: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_words: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    share_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True) # opaco para compartir link
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="teacher_profiles")
    submissions: Mapped[List["ProfileSubmission"]] = relationship("ProfileSubmission", back_populates="profile", cascade="all, delete-orphan")
    institution: Mapped[Optional["Institution"]] = relationship("Institution", back_populates="teacher_profiles")

class ProfileSubmission(Base):
    __tablename__ = "profile_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="RESTRICT"), nullable=False, unique=True)
    student_label: Mapped[Optional[str]] = mapped_column(String(150), nullable=True) # Nombre/Carné opcional
    passed_validation: Mapped[bool] = mapped_column(Boolean, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    profile: Mapped["TeacherProfile"] = relationship("TeacherProfile", back_populates="submissions")
    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="profile_submission")
