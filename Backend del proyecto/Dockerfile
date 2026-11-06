FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libgomp1: requerido por scikit-learn (OpenMP) en la imagen slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# MM_DATABASE_URL (PostgreSQL/Neon), MM_JWT_SECRET y MM_MYSQL_* se inyectan
# por variables de entorno (docker-compose). No hay secretos en la imagen.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]