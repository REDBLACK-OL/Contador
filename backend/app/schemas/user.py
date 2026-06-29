from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="La contraseña debe tener al menos 8 caracteres")

class UserLogin(UserBase):
    password: str
    role: str = "estudiante"

class UserOut(UserBase):
    id: int
    role: str
    is_active: bool

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: str | None = None
