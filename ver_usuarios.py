import asyncio
import os
import sys
from sqlalchemy import select

# Agregar el directorio actual al path de Python para importar 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from app.models.user import User

async def main():
    print("=" * 60)
    print("           USUARIOS REGISTRADOS EN WORDCOUNT PRO")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        if not users:
            print("No hay ningún usuario registrado aún.")
            print("=" * 60)
            return

        print(f"{'ID':<38} | {'EMAIL':<30} | {'NOMBRE':<25} | {'ROL':<18}")
        print("-" * 118)
        for u in users:
            name = u.full_name or "Sin Nombre"
            print(f"{str(u.id):<38} | {u.email:<30} | {name:<25} | {u.role:<18}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
