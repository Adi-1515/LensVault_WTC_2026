import os
from celery import Celery
from PIL import Image

from app.database import SessionLocal
from app.models.photo import Photo

broker_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery("lensvault", broker=broker_url, backend=broker_url)

@celery_app.task(bind=True, max_retries=3)
def generate_thumbnails(self, photo_id: str, original_path: str):
    db = SessionLocal()
    try:
        if not original_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic')):
            photo = db.query(Photo).filter(Photo.id == photo_id).first()
            if photo:
                photo.thumbnail_status = "done" 
                db.commit()
            return
            
        img = Image.open(original_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Reliably resolve the /vault root path directly from settings
        storage_path = os.getenv("STORAGE_PATH", "/vault")
        thumb_dir = os.path.join(storage_path, "thumbnails", photo_id)
        os.makedirs(thumb_dir, exist_ok=True)
        
        sizes = {"small": 240, "medium": 720, "large": 1440}
        
        for name, max_dim in sizes.items():
            img_copy = img.copy()
            img_copy.thumbnail((max_dim, max_dim))
            img_copy.save(os.path.join(thumb_dir, f"{name}.webp"), format="WEBP", quality=85)
            
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if photo:
            photo.thumbnail_status = "done"
            db.commit()
            
    except Exception as exc:
        db.rollback()
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if photo and self.request.retries == self.max_retries:
            photo.thumbnail_status = "failed"
            db.commit()
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
    finally:
        db.close()
