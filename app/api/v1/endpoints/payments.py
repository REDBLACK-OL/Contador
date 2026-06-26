from datetime import date, timedelta
from typing import Optional
import uuid
import secrets
from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.subscription import Subscription, Payment
from app.core.exceptions import DuplicatePaymentEventError
from pydantic import BaseModel

router = APIRouter()

class CheckoutIntentCreate(BaseModel):
    plan_type: str # premium_monthly, premium_annual, institutional

class CheckoutIntentOut(BaseModel):
    payment_id: uuid.UUID
    client_secret: str
    amount: float
    currency: str

class WebhookPayloadSimulated(BaseModel):
    provider_payment_id: str
    payment_id: uuid.UUID
    success: bool = True

@router.post("/checkout-intent", response_model=CheckoutIntentOut)
async def create_checkout_intent(
    payload: CheckoutIntentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una intención de pago en base de datos.
    El SDK de Culqi/Stripe capturará los datos reales de la tarjeta directamente en el cliente (BR-060).
    """
    if payload.plan_type not in {"premium_monthly", "premium_annual", "institutional"}:
        raise HTTPException(status_code=400, detail="Plan seleccionado inválido.")

    # Definir precios según configuración (BR-013)
    prices = {
        "premium_monthly": 15.00,
        "premium_annual": 120.00,
        "institutional": 199.00
    }
    amount = prices[payload.plan_type]

    # 1. Crear o actualizar la suscripción del usuario en estado temporal/pendiente
    db_sub = Subscription(
        user_id=current_user.id,
        plan_type=payload.plan_type,
        status="past_due",  # Comienza inactiva hasta que el webhook confirme
        start_date=date.today(),
        amount=amount,
        currency="PEN"
    )
    db.add(db_sub)
    await db.flush()

    # 2. Generar registro del pago en estado pendiente
    secrets_token = secrets.token_hex(8)
    db_payment = Payment(
        subscription_id=db_sub.id,
        user_id=current_user.id,
        provider="stripe",  # Proveedor por defecto
        provider_payment_id=f"pi_mock_{secrets_token}",
        amount=amount,
        currency="PEN",
        status="pending"
    )
    db.add(db_payment)
    await db.flush()

    return CheckoutIntentOut(
        payment_id=db_payment.id,
        client_secret=secrets_token,
        amount=amount,
        currency="PEN"
    )

@router.post("/webhook/stripe-simulated", status_code=status.HTTP_200_OK)
async def stripe_webhook_simulated(
    payload: WebhookPayloadSimulated,
    db: AsyncSession = Depends(get_db)
):
    """
    Simulador de webhook para pasarelas de pago.
    BR-061: Verifica idempotencia por provider_payment_id.
    BR-062: Activación del plan y registro del pago en una única transacción atómica.
    """
    # 1. Verificar idempotencia
    query_pay_exist = select(Payment).where(Payment.provider_payment_id == payload.provider_payment_id)
    res_pay = await db.execute(query_pay_exist)
    existing_payment = res_pay.scalar_one_or_none()

    if existing_payment and existing_payment.status == "succeeded":
        # Si ya se procesó de forma exitosa, lo ignoramos sin tirar error de caída (BR-061)
        return {"success": True, "message": "Evento ya procesado (idempotente)."}

    # 2. Buscar el pago correspondiente registrado como pendiente
    query_pay = select(Payment).where(Payment.id == payload.payment_id)
    res_query = await db.execute(query_pay)
    payment = res_query.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Intención de pago no encontrada.")

    # 3. Transacción atómica: Actualizar pago y suscripción
    if payload.success:
        payment.status = "succeeded"
        payment.provider_payment_id = payload.provider_payment_id
        db.add(payment)

        # Buscar y actualizar suscripción
        sub_query = select(Subscription).where(Subscription.id == payment.subscription_id)
        sub_res = await db.execute(sub_query)
        subscription = sub_res.scalar_one()

        subscription.status = "active"
        # Calcular fecha fin según el tipo de plan
        duration = 365 if subscription.plan_type == "premium_annual" else 30
        subscription.end_date = date.today() + timedelta(days=duration)
        db.add(subscription)

        # Si el usuario tenía rol free_user, actualizar su rol funcional a premium_user
        user_query = select(User).where(User.id == subscription.user_id)
        user_res = await db.execute(user_query)
        user = user_res.scalar_one()
        if user.role == "free_user":
            user.role = "premium_user"
            db.add(user)

        # El commit lo maneja el middleware get_db al finalizar la petición garantizando la atomicidad (BR-062)
        return {"success": True, "message": "Pago exitoso. Suscripción activada."}
    else:
        payment.status = "failed"
        db.add(payment)
        return {"success": False, "message": "Transacción fallida registrada."}
