# Root-level Dockerfile for Railway deployment
# Railway uses repo root as build context, so paths must be prefixed with backend/

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libjpeg-dev \
    libwebp-dev \
    libheif-dev \
    libde265-dev \
    ffmpeg \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# RUN apt-get update && apt-get install -y \
#     build-essential \
#     g++ \
#     cmake \
#     libgl1 \
#     libglib2.0-0 \
#     && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend/ subdirectory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ .

# Create storage dirs
RUN mkdir -p /vault/originals /vault/thumbnails /vault/ai_cache

EXPOSE 8000
