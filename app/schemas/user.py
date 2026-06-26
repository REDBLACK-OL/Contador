import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    email_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
