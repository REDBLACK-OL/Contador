import asyncio
import os
import sys
from sqlalchemy import select, update

# Agregar el directorio actual al path de Python para importar 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from app.models.user import User

async def main():
    if len(sys.argv) < 3:
        print("Uso: python cambiar_rol.py <email> <rol>")
        print("Roles permitidos: free_user, premium_user, teacher, institution_admin")
        return

    email = sys.argv[1].lower().strip()
    new_role = sys.argv[2].lower().strip()

    allowed_roles = {"free_user", "premium_user", "teacher", "institution_admin"}
    if new_role not in allowed_roles:
        print(f"Error: El rol '{new_role}' no es válido.")
        print(f"Roles permitidos: {', '.join(allowed_roles)}")
        return

    async with AsyncSessionLocal() as db:
        # Buscar usuario
        query = select(User).where(User.email == email)
        res = await db.execute(query)
        user = res.scalar_one_or_none()

        if not user:
            print(f"Error: No se encontró ningún usuario con el correo '{email}'.")
            return

        # Actualizar rol
        user.role = new_role
        db.add(user)
        await db.commit()
        print(f"¡Éxito! El usuario '{email}' ahora tiene el rol: '{new_role}'.")

if __name__ == "__main__":
    asyncio.run(main())
