from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.models.user import User, RefreshToken

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        # El email se compara de forma case-insensitive por BR-048
        query = select(User).where(select(User).c.email.ilike(email))
        # Nota: en SQLAlchemy 2.0 select(User).where(User.email.ilike(email)) es preferible
        query = select(User).where(User.email.ilike(email))
        result = await db.execute(query)
        return result.scalar_one_or_none()

class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self):
        super().__init__(RefreshToken)

    async def get_by_hash(self, db: AsyncSession, token_hash: str) -> Optional[RefreshToken]:
        query = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(query)
        return result.scalar_one_or_none()

user_repository = UserRepository()
refresh_token_repository = RefreshTokenRepository()
