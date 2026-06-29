from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Normalizar email de forma case-insensitive (Regla BR-048)
    email_normalized = user_in.email.lower().strip()
    
    # Verificar duplicado
    result = await db.execute(select(User).where(User.email == email_normalized))
    user_exists = result.scalars().first()
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado"
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=email_normalized,
        hashed_password=hashed_pwd,
        role="free_user"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    email_normalized = credentials.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_normalized))
    user = result.scalars().first()
    
    # Auto-registro si el usuario no existe
    if not user:
        hashed_pwd = get_password_hash(credentials.password)
        user = User(
            email=email_normalized,
            hashed_password=hashed_pwd,
            role=credentials.role
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Modo libre (Mock): Se acepta cualquier contrasea sin verificar
        # if not verify_password(credentials.password, user.hashed_password): ...
        
        # Actualizar rol si cambi
        if user.role != credentials.role:
            user.role = credentials.role
            await db.commit()
            await db.refresh(user)
        
    # Crear token
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }
