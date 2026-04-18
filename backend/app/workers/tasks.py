import os
import subprocess
import logging
from celery import Celery
from PIL import Image

logger = logging.getLogger(__name__)

broker_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery("lensvault", broker=broker_url, backend=broker_url)

STORAGE_PATH = os.getenv("STORAGE_PATH", "/vault")
THUMB_SIZES = {"small": 240, "medium": 720, "large": 1440}

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.tif', '.bmp'}
HEIC_EXTENSIONS = {'.heic', '.heif'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp'}


def _make_thumb_dir(photo_id: str) -> str:
    thumb_dir = os.path.join(STORAGE_PATH, "thumbnails", photo_id)
    os.makedirs(thumb_dir, exist_ok=True)
    return thumb_dir


def _save_pil_thumbnails(img: Image.Image, thumb_dir: str):
    """Generate small/medium/large WebP thumbnails from a PIL Image."""
    if img.mode not in ('RGB', 'RGBA'):
        img = img.convert('RGB')
    elif img.mode == 'RGBA':
        # Flatten alpha onto white background for WebP
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background

    for size_name, max_dim in THUMB_SIZES.items():
        thumb = img.copy()
        thumb.thumbnail((max_dim, max_dim), Image.LANCZOS)
        out_path = os.path.join(thumb_dir, f"{size_name}.webp")
        thumb.save(out_path, format="WEBP", quality=85, method=6)
        logger.info(f"Saved {size_name} thumbnail: {out_path}")


def _generate_image_thumbnails(original_path: str, thumb_dir: str):
    """Handle JPEG, PNG, WEBP, GIF, TIFF via Pillow."""
    img = Image.open(original_path)
    # Handle animated GIF — use first frame
    if getattr(img, 'is_animated', False):
        img.seek(0)
        img = img.copy()
    _save_pil_thumbnails(img, thumb_dir)


def _generate_heic_thumbnails(original_path: str, thumb_dir: str):
    """Handle HEIC/HEIF via pillow-heif."""
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
        img = Image.open(original_path)
        _save_pil_thumbnails(img, thumb_dir)
    except ImportError:
        logger.warning("pillow-heif not installed; falling back to ffmpeg for HEIC")
        _generate_video_thumbnails(original_path, thumb_dir)


def _generate_video_thumbnails(original_path: str, thumb_dir: str):
    """Extract a frame at 1 second using ffmpeg, then resize to WebP thumbnails."""
    frame_path = os.path.join(thumb_dir, "frame.jpg")

    # Extract frame at 1s (fallback to 0s if video is shorter)
    result = subprocess.run([
        "ffmpeg", "-y",
        "-ss", "1",           # seek to 1 second
        "-i", original_path,
        "-vframes", "1",      # capture exactly 1 frame
        "-q:v", "2",          # high quality JPEG
        "-vf", "scale=1440:-1",  # max 1440px wide, preserve aspect ratio
        frame_path
    ], capture_output=True, timeout=60)

    if result.returncode != 0:
        # Try from the very start (video might be <1s)
        result = subprocess.run([
            "ffmpeg", "-y",
            "-i", original_path,
            "-vframes", "1",
            "-q:v", "2",
            "-vf", "scale=1440:-1",
            frame_path
        ], capture_output=True, timeout=60)

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()}")

    if not os.path.exists(frame_path):
        raise RuntimeError("ffmpeg did not produce a frame file")

    # Now resize the extracted frame to all thumbnail sizes
    img = Image.open(frame_path)
    _save_pil_thumbnails(img, thumb_dir)

    # Clean up temp frame
    try:
        os.remove(frame_path)
    except Exception:
        pass


@celery_app.task(bind=True, max_retries=3)
def generate_thumbnails(self, photo_id: str, original_path: str):
    from app.database import SessionLocal
    from app.models.photo import Photo

    db = SessionLocal()
    try:
        if not os.path.exists(original_path):
            logger.error(f"Original file not found: {original_path}")
            return

        thumb_dir = _make_thumb_dir(photo_id)
        ext = os.path.splitext(original_path)[1].lower()

        if ext in IMAGE_EXTENSIONS:
            _generate_image_thumbnails(original_path, thumb_dir)
        elif ext in HEIC_EXTENSIONS:
            _generate_heic_thumbnails(original_path, thumb_dir)
        elif ext in VIDEO_EXTENSIONS:
            _generate_video_thumbnails(original_path, thumb_dir)
        else:
            logger.warning(f"Unsupported format for thumbnails: {ext} — skipping")

        # Mark as done
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if photo:
            photo.thumbnail_status = "done"
            db.commit()
        logger.info(f"Thumbnails complete for photo {photo_id}")

    except Exception as exc:
        logger.exception(f"Thumbnail generation failed for {photo_id}: {exc}")
        db.rollback()

        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if photo:
            if self.request.retries >= self.max_retries:
                photo.thumbnail_status = "failed"
                db.commit()

        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

    finally:
        db.close()


@celery_app.task
def retry_failed_thumbnails():
    """Periodic task to retry all photos with thumbnail_status='failed'."""
    from app.database import SessionLocal
    from app.models.photo import Photo

    db = SessionLocal()
    try:
        failed = db.query(Photo).filter(Photo.photo.thumbnail_status == "failed").all()
        for photo in failed:
            photo.thumbnail_status = "pending"
            db.commit()
            generate_thumbnails.delay(str(photo.id), photo.storage_path)
        logger.info(f"Retrying thumbnails for {len(failed)} photos")
    finally:
        db.close()

# --- AI Face Grouping ---

_face_app = None

def get_face_app():
    global _face_app
    if _face_app is None:
        import numpy as np
        from insightface.app import FaceAnalysis
        # Uses INSIGHTFACE_HOME which we mapped to /vault/ai_cache
        _face_app = FaceAnalysis(name='buffalo_l')
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
    return _face_app

def _save_face_crop(img_path: str, bbox: list, face_id: str):
    """Crop the face from the original image and save it as WebP."""
    try:
        img = Image.open(img_path)
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGB')
        
        x1, y1, x2, y2 = bbox
        # Add 20% padding around the face
        w, h = x2 - x1, y2 - y1
        px, py = int(w * 0.2), int(h * 0.2)
        x1, y1 = max(0, int(x1) - px), max(0, int(y1) - py)
        x2, y2 = min(img.width, int(x2) + px), min(img.height, int(y2) + py)

        crop = img.crop((x1, y1, x2, y2))
        crop.thumbnail((150, 150), Image.LANCZOS)
        
        faces_dir = os.path.join(STORAGE_PATH, "faces")
        os.makedirs(faces_dir, exist_ok=True)
        out_path = os.path.join(faces_dir, f"{face_id}.webp")
        crop.save(out_path, format="WEBP", quality=85)
        return out_path
    except Exception as e:
        logger.error(f"Failed to save face crop for {face_id}: {e}")
        return None

@celery_app.task(bind=True, max_retries=3)
def extract_faces(self, photo_id: str, original_path: str):
    from app.database import SessionLocal
    from app.models.photo import Photo
    from app.models.user import User
    from app.models.face import Face
    import cv2
    import numpy as np
    
    db = SessionLocal()
    try:
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo or not os.path.exists(original_path):
            return

        # Skip videos and unsupported formats for now
        ext = os.path.splitext(original_path)[1].lower()
        if ext not in IMAGE_EXTENSIONS:
            return

        img = cv2.imread(original_path)
        if img is None:
            return

        face_app = get_face_app()
        faces = face_app.get(img)

        logger.info(f"Detected {len(faces)} faces in {photo_id}")
        
        for f in faces:
            bbox = f.bbox.astype(int).tolist()
            embedding = f.embedding.astype(np.float32)

            new_face = Face(
                photo_id=photo.id,
                user_id=photo.user_id,
                bounding_box=bbox,
                embedding=embedding.tobytes()
            )
            db.add(new_face)
            db.flush() # get new_face.id

            _save_face_crop(original_path, bbox, str(new_face.id))

        db.commit()

    except Exception as exc:
        logger.exception(f"Face extraction failed for {photo_id}: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
    finally:
        db.close()

@celery_app.task(bind=True)
def run_clustering(self, user_id: str):
    from app.workers.clustering import perform_dbscan
    # Default eps = 0.5 as requested by user
    perform_dbscan(user_id, eps=0.5)
