import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import regex
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, RefreshToken
from app.repositories.user_repository import user_repository, refresh_token_repository
from app.core import security
from app.core.exceptions import TokenReuseDetectedError, InvalidCredentialsFormatError
from app.core.config import settings

# Expresión regular simplificada pero robusta para correos (BR-048)
EMAIL_REGEX = regex.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

class AuthService:
    def _hash_token(self, token: str) -> str:
        """Calcula el hash SHA-256 de un token para guardado seguro (BR-042)."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def validate_password_policy(self, password: str) -> None:
        """
        Valida que la contraseña cumpla con las políticas del sistema.
        BR-047: Mínimo 8 caracteres, combinando letras y números.
        """
        if len(password) < 8:
            raise InvalidCredentialsFormatError("La contraseña debe tener al menos 8 caracteres.")
        if not regex.search(r'\p{L}', password) or not regex.search(r'\d', password):
            raise InvalidCredentialsFormatError("La contraseña debe combinar letras y números.")

    def validate_email_format(self, email: str) -> None:
        """Valida que el formato del email sea correcto (BR-048)."""
        if not EMAIL_REGEX.match(email):
            raise InvalidCredentialsFormatError("El formato del correo electrónico es inválido.")

    async def register(self, db: AsyncSession, email: str, password: str, full_name: Optional[str] = None) -> User:
        """Registra un nuevo usuario con plan free por defecto."""
        email = email.strip()
        self.validate_email_format(email)
        self.validate_password_policy(password)

        # Verificar duplicados case-insensitive (BR-048)
        existing_user = await user_repository.get_by_email(db, email)
        if existing_user:
            raise InvalidCredentialsFormatError("El correo electrónico ya se encuentra registrado.")

        hashed_password = security.get_password_hash(password)
        
        email_lower = email.lower()
        if "admin" in email_lower:
            assigned_role = "institution_admin"
        elif "profe" in email_lower or "docente" in email_lower:
            assigned_role = "teacher"
        else:
            assigned_role = "free_user"

        new_user = User(
            email=email_lower,  # Guardar siempre en minúsculas por consistencia
            password_hash=hashed_password,
            full_name=full_name,
            role=assigned_role
        )
        db.add(new_user)
        await db.flush()
        return new_user

    async def authenticate(self, db: AsyncSession, email: str, password: str) -> User:
        """Autentica a un usuario verificando contraseña."""
        email = email.strip()
        user = await user_repository.get_by_email(db, email)
        if not user or not user.is_active:
            raise InvalidCredentialsFormatError("Credenciales incorrectas o cuenta inactiva.")

        if not security.verify_password(password, user.password_hash):
            raise InvalidCredentialsFormatError("Credenciales incorrectas o cuenta inactiva.")

        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        await db.flush()
        return user

    async def create_session(self, db: AsyncSession, user_id: str, device_info: Optional[str] = None) -> Tuple[str, str]:
        """Genera access_token y refresh_token y guarda el hash del refresh_token (BR-042)."""
        access_token = security.create_access_token(subject=user_id)
        refresh_token = security.create_refresh_token(subject=user_id)

        token_hash = self._hash_token(refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        db_refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            device_info=device_info,
            revoked=False,
            expires_at=expires_at
        )
        db.add(db_refresh_token)
        await db.flush()

        return access_token, refresh_token

    async def refresh(self, db: AsyncSession, refresh_token: str, device_info: Optional[str] = None) -> Tuple[str, str]:
        """
        Rota el refresh token. Valida contra reutilización.
        BR-043: Si se reutiliza un refresh_token ya rotado/revocado, se revocan TODAS las sesiones del usuario.
        """
        user_id = security.verify_token(refresh_token, settings.JWT_REFRESH_SECRET)
        if not user_id:
            raise TokenReuseDetectedError("Token de sesión expirado o inválido.")

        token_hash = self._hash_token(refresh_token)
        db_token = await refresh_token_repository.get_by_hash(db, token_hash)

        # Si el token no existe o ya estaba revocado, sospechamos de robo/reuso
        if not db_token or db_token.revoked or db_token.expires_at < datetime.now(timezone.utc):
            if db_token:
                # Revocar todas las sesiones del usuario para mitigar robo
                await self.revoke_all_sessions(db, db_token.user_id)
            raise TokenReuseDetectedError("Sesión inválida o reutilización de token detectada. Se han cerrado todas las sesiones por seguridad.")

        # Marcar el token viejo como revocado (rotación)
        db_token.revoked = True
        db.add(db_token)

        # Crear nueva sesión (nuevo access_token y nuevo refresh_token)
        new_access_token, new_refresh_token = await self.create_session(db, user_id, device_info)
        return new_access_token, new_refresh_token

    async def revoke_session(self, db: AsyncSession, refresh_token: str) -> None:
        """Revoca un refresh token individual al cerrar sesión."""
        token_hash = self._hash_token(refresh_token)
        db_token = await refresh_token_repository.get_by_hash(db, token_hash)
        if db_token:
            db_token.revoked = True
            db.add(db_token)

    async def revoke_all_sessions(self, db: AsyncSession, user_id: str) -> None:
        """Cierra todas las sesiones activas de un usuario revocando sus refresh tokens (BR-045)."""
        query = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id)
            .where(RefreshToken.revoked == False)
            .values(revoked=True)
        )
        await db.execute(query)

auth_service = AuthService()
