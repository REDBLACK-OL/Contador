from datetime import date
from typing import Tuple, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.subscription import Subscription
from app.core.exceptions import PlanLimitExceededError
from app.core.config import settings

class SubscriptionService:
    async def get_effective_plan(self, db: AsyncSession, user_id: Optional[str]) -> Tuple[str, str]:
        """
        Resuelve el plan y el estado efectivo del usuario comparando las suscripciones activas.
        Devuelve una tupla (plan_type, status).
        Si no hay usuario (anónimo) o no hay suscripción, devuelve ("free", "expired").
        BR-001, BR-002: Degrada automáticamente planes vencidos al comparar end_date con la fecha actual.
        """
        if not user_id:
            return "free", "expired"

        # Buscar suscripción más reciente y activa/past_due del usuario
        query = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        result = await db.execute(query)
        sub = result.scalar_one_or_none()

        if not sub:
            return "free", "expired"

        # BR-002: Si la suscripción ha vencido, degradar implícitamente en el request
        # y guardar el cambio si está marcado como active
        today = date.today()
        if sub.end_date and sub.end_date < today:
            if sub.status in {"active", "past_due"}:
                # Actualizar base de datos de forma diferida (se confirma con la transacción del request)
                sub.status = "expired"
                db.add(sub)
            return "free", "expired"

        # Si el estado es cancelado pero aún no expira, se conserva la capacidad (BR-014)
        if sub.status == "cancelled":
            if sub.end_date and sub.end_date >= today:
                return sub.plan_type, "cancelled"
            else:
                sub.status = "expired"
                db.add(sub)
                return "free", "expired"

        # Si el plan está expirado
        if sub.status == "expired":
            return "free", "expired"

        return sub.plan_type, sub.status

    async def validate_word_limit(self, db: AsyncSession, user_id: Optional[str], word_count: int) -> None:
        """
        Valida que el conteo de palabras no exceda el límite del plan del usuario.
        BR-011: Valida el límite de 5,000 palabras en plan gratuito de forma fail-fast.
        """
        plan_type, _ = await self.get_effective_plan(db, user_id)
        
        if plan_type == "free" and word_count > settings.FREE_PLAN_WORD_LIMIT:
            raise PlanLimitExceededError(
                f"Límite de palabras del plan gratuito excedido. El límite es de {settings.FREE_PLAN_WORD_LIMIT} palabras "
                f"y enviaste {word_count} palabras. ¡Pásate a Premium para análisis ilimitados!"
            )

subscription_service = SubscriptionService()
