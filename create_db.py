import asyncio
import asyncpg

async def main():
    try:
        # Conectar a la base de datos 'postgres' por defecto
        conn = await asyncpg.connect(
            user='postgres',
            password='saul1234567',
            host='127.0.0.1',
            port=5432,
            database='postgres'
        )
        try:
            # Intentar crear la base de datos
            await conn.execute("CREATE DATABASE wordcountpro_dev")
            print("Base de datos 'wordcountpro_dev' creada con éxito.")
        except asyncpg.exceptions.DuplicateDatabaseError:
            print("La base de datos 'wordcountpro_dev' ya existe, todo listo.")
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error al conectar a PostgreSQL: {e}")

if __name__ == "__main__":
    asyncio.run(main())
