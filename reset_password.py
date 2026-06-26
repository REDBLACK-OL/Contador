import asyncio
import os
import sys
from sqlalchemy import select

# Agregar el directorio actual al path de Python para importar 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core import security

async def main():
    email = "admin@gmail.com"
    new_password = "admin123"
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        
        if not user:
            print(f"No se encontró el usuario {email}. Creándolo como admin...")
            hashed_password = security.get_password_hash(new_password)
            user = User(
                email=email,
                password_hash=hashed_password,
                full_name="Administrador Cristiam",
                role="institution_admin"
            )
            db.add(user)
            await db.commit()
            print(f"Usuario {email} creado con éxito. Contraseña establecida a: {new_password}")
            return
            
        user.password_hash = security.get_password_hash(new_password)
        db.add(user)
        await db.commit()
        print(f"¡Éxito! La contraseña de {email} ha sido restablecida a: {new_password}")

if __name__ == "__main__":
    asyncio.run(main())
