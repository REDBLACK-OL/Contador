import asyncio
import os
import sys

# Agregar el directorio actual al path de Python para importar 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core import security

async def create_teacher(email: str, password: str, full_name: str):
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        # Verificar si ya existe
        res = await db.execute(select(User).where(User.email == email.lower().strip()))
        user = res.scalar_one_or_none()
        
        if user:
            print(f"El usuario {email} ya existe. Asegurando que su rol sea 'teacher'...")
            user.role = "teacher"
            db.add(user)
            await db.commit()
            print(f"Usuario {email} actualizado a rol 'teacher'.")
            return
            
        hashed_password = security.get_password_hash(password)
        new_user = User(
            email=email.lower().strip(),
            password_hash=hashed_password,
            full_name=full_name,
            role="teacher"
        )
        db.add(new_user)
        await db.commit()
        print(f"¡Éxito! Usuario docente creado: {email} | Contraseña: {password} | Nombre: {full_name}")

async def main():
    teachers = [
        ("profesor1@gmail.com", "profe123", "Profesor Saboya Uno"),
        ("profesor2@gmail.com", "profe123", "Profesora Ucayali Dos"),
        ("saboya@gmail.com", "saboya123", "Dr. Saboya Ucayali")
    ]
    
    print("=" * 60)
    print("           CREANDO USUARIOS DOCENTES EN LA DB")
    print("=" * 60)
    for email, password, full_name in teachers:
        await create_teacher(email, password, full_name)
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
