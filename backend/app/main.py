from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import settings

from app.api import auth, photos, albums, search

# Auto-create tables for hackathon
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LensVault API", description="Privacy-first photo library", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(photos.router)
app.include_router(albums.router)
app.include_router(search.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "LensVault API", "version": "2.0.0"}

@app.get("/")
def root():
    return {"message": "Welcome to LensVault API v2"}
