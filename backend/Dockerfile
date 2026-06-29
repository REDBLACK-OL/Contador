FROM python:3.10-slim

# Directorio de trabajo
WORKDIR /workspace

# Copiar dependencias e instalarlas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código fuente del backend
COPY . .

# Exponer el puerto de FastAPI
EXPOSE 8000

# Arrancar el servidor Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
