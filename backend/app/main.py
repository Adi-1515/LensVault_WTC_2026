import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run DB migrations on startup, gracefully handle missing DB."""
    try:
        from app.database import engine, Base
        from sqlalchemy import text
        import app.models.face # Import face model for table creation
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified")

        # Add new columns to existing tables (create_all won't do this)
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE albums ADD COLUMN IF NOT EXISTS album_type VARCHAR(50) DEFAULT 'normal' NOT NULL
            """))
            conn.execute(text("""
                ALTER TABLE albums ADD COLUMN IF NOT EXISTS metadata_json JSON
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_faces_person_photo ON faces (person_id, photo_id)
            """))
            conn.commit()
        logger.info("✅ Schema migrations applied")
    except Exception as e:
        logger.warning(f"⚠️  Database not available at startup: {e}")
        logger.warning("App will start anyway — DB-dependent routes will fail until connected")
    yield
    # Shutdown cleanup (if needed)


app = FastAPI(
    title="LensVault API",
    description="Privacy-first photo library",
    version="2.0.0",
    lifespan=lifespan
)

# CORS — support comma-separated or single origin
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import auth, photos, albums, search, faces
app.include_router(auth.router)
app.include_router(photos.router)
app.include_router(albums.router)
app.include_router(search.router)
app.include_router(faces.router)


@app.get("/health")
def health_check():
    """Health check — always responds even if DB is down."""
    db_ok = False
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        db.execute(__import__('sqlalchemy').text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        pass
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "LensVault API",
        "version": "2.0.0",
        "database": "connected" if db_ok else "unavailable"
    }


@app.get("/")
def root():
    return {"message": "Welcome to LensVault API v2", "docs": "/docs"}
