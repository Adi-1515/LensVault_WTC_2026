# Root-level Dockerfile for Railway deployment
# Railway uses repo root as build context, so paths must be prefixed with backend/

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libjpeg-dev \
    libwebp-dev \
    libheif-dev \
    libde265-dev \
    ffmpeg \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend/ subdirectory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ .

# Create storage dirs
RUN mkdir -p /vault/originals /vault/thumbnails /vault/ai_cache

EXPOSE 8000
