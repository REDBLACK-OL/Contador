"""
WordCount Pro - Servidor Simple (Sin base de datos)
====================================================
Funciona 100% en memoria. Los usuarios registrados se guardan
mientras el servidor esté corriendo.

Arrancar con:
    .\\venv\\Scripts\\python.exe server_simple.py
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
import json

app = FastAPI(
    title="WordCount Pro API (Modo Simple)",
    description="Backend sin base de datos - ideal para pruebas locales",
    version="1.0.0"
)

# CORS abierto para el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ============================================================
# BASE DE DATOS EN MEMORIA
# ============================================================
# Estructura: { "email": { "password_hash": str, "role": str, "plan": str } }
USERS_DB: dict = {}

# Estructura: { "token": { "email": str, "expires": datetime } }
TOKENS_DB: dict = {}

# Autoguardados: { "email": [ { "text": str, "time": str, "wordCount": int } ] }
AUTOSAVE_DB: dict = {}


# ============================================================
# SCHEMAS (Pydantic)
# ============================================================
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AutosaveRequest(BaseModel):
    text: str

class TextAnalyzeRequest(BaseModel):
    text: str


# ============================================================
# UTILIDADES
# ============================================================
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(email: str) -> str:
    token = secrets.token_urlsafe(32)
    TOKENS_DB[token] = {
        "email": email,
        "expires": datetime.utcnow() + timedelta(hours=8)
    }
    return token

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Token requerido")
    token = credentials.credentials
    session = TOKENS_DB.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    if datetime.utcnow() > session["expires"]:
        del TOKENS_DB[token]
        raise HTTPException(status_code=401, detail="Token expirado")
    return session["email"]


# ============================================================
# RUTAS DE AUTENTICACIÓN
# ============================================================
@app.post("/api/v1/auth/register")
def register(req: RegisterRequest):
    email = req.email.lower().strip()
    
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Correo electrónico inválido")
    
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    if email in USERS_DB:
        raise HTTPException(status_code=409, detail="Este correo ya está registrado")
    
    USERS_DB[email] = {
        "password_hash": hash_password(req.password),
        "role": "student",
        "plan": "free",
        "created_at": datetime.utcnow().isoformat()
    }
    
    print(f"[REGISTRO] Nuevo usuario: {email}")
    return {"message": "Registro exitoso. Ya puedes iniciar sesión.", "email": email}


@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = USERS_DB.get(email)
    
    if not user or user["password_hash"] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    token = create_token(email)
    print(f"[LOGIN] Usuario autenticado: {email}")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "plan": user["plan"],
        "email": email
    }


@app.get("/api/v1/auth/me")
def get_me(current_user: str = Depends(get_current_user)):
    user = USERS_DB.get(current_user, {})
    return {
        "email": current_user,
        "role": user.get("role", "student"),
        "plan": user.get("plan", "free")
    }


# ============================================================
# RUTAS DE ANÁLISIS
# ============================================================
@app.post("/api/v1/analyze/analyze")
def analyze_text(req: TextAnalyzeRequest, current_user: Optional[str] = Depends(get_current_user)):
    text = req.text
    words = [w for w in text.split() if w.strip()]
    sentences = [s for s in text.replace("?","。").replace("!","。").split("。") if s.strip()]
    paragraphs = [p for p in text.split("\n") if p.strip()]
    
    return {
        "word_count": len(words),
        "character_count": len(text),
        "character_count_no_spaces": len(text.replace(" ", "")),
        "sentence_count": len(sentences),
        "paragraph_count": len(paragraphs),
        "reading_time_seconds": round((len(words) / 200) * 60)
    }


@app.post("/api/v1/analyze/autosave")
def autosave(req: AutosaveRequest, current_user: str = Depends(get_current_user)):
    words = len([w for w in req.text.split() if w.strip()])
    
    if current_user not in AUTOSAVE_DB:
        AUTOSAVE_DB[current_user] = []
    
    AUTOSAVE_DB[current_user].insert(0, {
        "text": req.text[:500],  # guardamos preview
        "word_count": words,
        "saved_at": datetime.utcnow().isoformat()
    })
    
    # Máximo 10 versiones por usuario
    AUTOSAVE_DB[current_user] = AUTOSAVE_DB[current_user][:10]
    
    return {"message": "Guardado automático exitoso", "word_count": words}


@app.get("/api/v1/analyze/history")
def get_history(current_user: str = Depends(get_current_user)):
    return AUTOSAVE_DB.get(current_user, [])


@app.get("/api/v1/analyze/versions")
def get_versions(current_user: str = Depends(get_current_user)):
    return AUTOSAVE_DB.get(current_user, [])


# ============================================================
# RUTA RAÍZ
# ============================================================
@app.get("/")
def root():
    users_count = len(USERS_DB)
    return {
        "message": "WordCount Pro API activa ✓",
        "mode": "simple (sin base de datos)",
        "users_registered": users_count,
        "docs": "Ve a /docs para ver la documentación interactiva"
    }


# ============================================================
# INICIO DEL SERVIDOR
# ============================================================
if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*55)
    print("  WordCount Pro - Servidor Simple")
    print("  Sin base de datos - Modo desarrollo")
    print("="*55)
    print("  URL:  http://localhost:8000")
    print("  Docs: http://localhost:8000/docs")
    print("  Para salir: Ctrl+C")
    print("="*55 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
