# WordCount Pro — Plataforma de Inteligencia y Análisis Textual

Este es el repositorio completo de **WordCount Pro**, un software diseñado y optimizado para la auditoría y validación de métricas de redacción académica en español. Cuenta con una arquitectura desacoplada en Frontend (React, Vite) y Backend (FastAPI, PostgreSQL).

---

## 📁 Estructura del Workspace

El proyecto está organizado en las siguientes carpetas principales:

*   **`backend/`**: API en tiempo real construida con **FastAPI** y base de datos asíncrona.
    *   `app/core/`: Configuración y utilidades de firma de tokens JWT con Bcrypt.
    *   `app/db/`: Inicialización de la sesión asíncrona de base de datos SQLAlchemy con PostgreSQL.
    *   `app/models/`: Modelos ORM para usuarios, análisis y borradores.
    *   `app/services/text_analysis/`: El motor de análisis en español que gestiona el conteo de palabras compuestas (Regla BR-022) e índices Fernández-Huerta.
    *   `app/api/v1/endpoints/`: Rutas de registro/login, límites de palabras e historial de versiones.
*   **`frontend/`**: Cliente Web interactivo e inteligente desarrollado con **React (JavaScript), Vite y Tailwind CSS**.
    *   `src/services/textMetrics.js`: Motor de métricas e índices replicados en tiempo real en cliente.
    *   `src/services/api/client.js`: Cliente HTTP para el consumo de endpoints asíncronos del backend.
    *   `src/App.jsx`: Interfaz UI Premium que conecta la cabecera, la barra lateral y los formularios de acceso seguros.
*   **`shared/`**: Recursos compartidos.
    *   `golden_tests.json`: El banco de pruebas doradas del motor (Regla BR-022 y BR-020) para auditoría cruzada.
*   **`docker-compose.yml`**: Orquestación para levantar PostgreSQL y Redis en contenedores locales.
*   **`diseno_wordcount_pro.html`**: Maqueta interactiva de alta fidelidad, con simulación OCR Tesseract.js real y copiloto de visión por IA.

---

## 🚀 Guía de Instalación y Ejecución en Local (Windows / macOS)

### 1. Iniciar Base de Datos y Caché (Docker)
Asegúrate de tener Docker instalado en tu máquina. Levanta los contenedores locales desde la raíz del proyecto ejecutando:
```bash
docker-compose up -d
```
Esto creará y expondrá en segundo plano:
*   **PostgreSQL** en el puerto `5432` (Base de datos: `wordcount_pro`).
*   **Redis** en el puerto `6379`.

---

### 2. Levantar el Backend (FastAPI)
1. Navega a la carpeta de servidor:
   ```bash
   cd backend
   ```
2. Crea e inicia un entorno virtual de Python:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # En Windows
   source venv/bin/activate # En macOS/Linux
   ```
3. Instala todas las dependencias requeridas:
   ```bash
   pip install -r requirements.txt
   ```
4. Inicia el servidor de desarrollo local de FastAPI:
   ```bash
   uvicorn app.main:app --reload
   ```
*La base de datos se migrará y creará sus tablas automáticamente al iniciar el backend.*
*Acceso a documentación de APIs auto-generada:* [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Levantar el Frontend (React + Vite)
1. En una nueva terminal, navega a la carpeta de cliente:
   ```bash
   cd frontend
   ```
2. Instala los paquetes requeridos por npm:
   ```bash
   npm install
   ```
3. Levanta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
*Acceso al cliente:* [http://localhost:5173](http://localhost:5173)

---

## 🛡️ Reglas de Negocio Implementadas de Forma Coherente

*   **Regla BR-001 (Control de Perfiles - RBAC):** Soporte dinámico para vistas diferenciadas de Estudiantes y Docentes.
*   **Regla BR-010 y BR-011 (Monetización):** Rate limiting y validación de longitud de palabras límite (5k palabras gratuitas) antes de cargar recursos en la API del servidor.
*   **Regla BR-022 (Compuestas):** Palabras unidas por guiones (ej. *"franco-peruano"*) cuentan como un solo token en el backend y el frontend.
*   **Regla BR-039 (Autoguardado):** Debouncing de 3 segundos antes de registrar y persistir borradores temporales en base de datos.
