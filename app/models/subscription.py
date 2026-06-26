import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Date, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_type: Mapped[str] = mapped_column(String(20), nullable=False) # free, premium_monthly, premium_annual, institutional
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active") # active, expired, cancelled, past_due
    start_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="PEN", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="subscriptions")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False) # culqi, stripe
    provider_payment_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True) # Clave de idempotencia
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False) # pending, succeeded, failed, refunded
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    subscription: Mapped[Optional["Subscription"]] = relationship("Subscription", back_populates="payments")
