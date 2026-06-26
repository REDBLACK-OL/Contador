import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime, BIGINT, BigInteger
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    plan_type: Mapped[str] = mapped_column(String(20), default="institutional", nullable=False)
    max_users: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    members: Mapped[List["InstitutionMember"]] = relationship("InstitutionMember", back_populates="institution", cascade="all, delete-orphan")
    teacher_profiles: Mapped[List["TeacherProfile"]] = relationship("TeacherProfile", back_populates="institution")

class InstitutionMember(Base):
    __tablename__ = "institution_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_institution: Mapped[str] = mapped_column(String(20), nullable=False) # teacher, student, admin
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    institution: Mapped["Institution"] = relationship("Institution", back_populates="members")
    user: Mapped["User"] = relationship("User")

class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    referred_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), unique=True, nullable=False) # un usuario referido solo una vez
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False) # pending, rewarded
    reward_days_granted: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    referrer: Mapped["User"] = relationship("User", foreign_keys=[referrer_user_id], back_populates="referrals_as_referrer")
    referred: Mapped["User"] = relationship("User", foreign_keys=[referred_user_id], back_populates="referral_as_referred")

class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rate_limit_tier: Mapped[str] = mapped_column(String(20), default="standard", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="api_keys")
    usage_logs: Mapped[List["ApiUsageLog"]] = relationship("ApiUsageLog", back_populates="api_key", cascade="all, delete-orphan")

# Registrar User -> api_keys relación faltante en user.py
from app.models.user import User
User.api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")

class ApiUsageLog(Base):
    __tablename__ = "api_usage_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    api_key_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False)
    words_processed: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    api_key: Mapped["ApiKey"] = relationship("ApiKey", back_populates="usage_logs")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True) # Soporta IPv4 y IPv6
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
