import os
import math
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.photo import Photo, Album, AlbumPhoto
from app.schemas.photo import PhotoListResponse
from app.api.auth import get_current_user
from app.config import settings
from app.utils.hashing import compute_sha256, compute_phash
from app.utils.exif import extract_exif
from app.utils.storage import save_original
from app.workers.tasks import generate_thumbnails

router = APIRouter(prefix="/api/photos", tags=["photos"])

def enrich_photo_response(photo: Photo):
    photo_dict = {c.name: getattr(photo, c.name) for c in photo.__table__.columns if c.name != 'storage_path'}
    photo_dict['thumbnail_url'] = f"/api/photos/{photo.id}/thumbnail/medium"
    return photo_dict

@router.post("/upload", status_code=202)
def upload_photo(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not file.content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file_bytes = file.file.read()
    file_hash = compute_sha256(file_bytes)
    
    existing = db.query(Photo).filter(Photo.user_id == current_user.id, Photo.hash == file_hash).first()
    if existing:
        return enrich_photo_response(existing)
        
    exif_dict, canonical_date, lat, lon, width, height = extract_exif(file_bytes)
    storage_path = save_original(file_bytes, file.filename, canonical_date, settings.STORAGE_PATH)
    
    phash = compute_phash(storage_path) if file.content_type.startswith("image/") else None
    
    new_photo = Photo(
        user_id=current_user.id,
        hash=file_hash,
        phash=phash,
        filename=file.filename,
        mime_type=file.content_type,
        file_size=len(file_bytes),
        storage_path=storage_path,
        canonical_date=canonical_date,
        exif_json=exif_dict,
        latitude=lat,
        longitude=lon,
        width=width,
        height=height,
        thumbnail_status="pending"
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    
    generate_thumbnails.delay(str(new_photo.id), storage_path)
    
    return enrich_photo_response(new_photo)


@router.get("/memories")
def get_memories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Photos taken on today's date in previous years."""
    today = datetime.utcnow()
    photos = (
        db.query(Photo)
        .filter(
            Photo.user_id == current_user.id,
            func.extract('month', Photo.canonical_date) == today.month,
            func.extract('day', Photo.canonical_date) == today.day,
            func.extract('year', Photo.canonical_date) < today.year
        )
        .order_by(desc(Photo.canonical_date))
        .limit(50)
        .all()
    )
    return {"photos": [enrich_photo_response(p) for p in photos], "total": len(photos)}


@router.get("/geotagged")
def get_geotagged(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """All photos with GPS coordinates."""
    photos = (
        db.query(Photo)
        .filter(
            Photo.user_id == current_user.id,
            Photo.latitude.isnot(None),
            Photo.longitude.isnot(None)
        )
        .order_by(desc(Photo.canonical_date))
        .all()
    )
    return {"photos": [enrich_photo_response(p) for p in photos], "total": len(photos)}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Library statistics for the settings/admin page."""
    total_photos = db.query(Photo).filter(Photo.user_id == current_user.id).count()
    total_videos = db.query(Photo).filter(Photo.user_id == current_user.id, Photo.mime_type.startswith("video/")).count()
    total_favourites = db.query(Photo).filter(Photo.user_id == current_user.id, Photo.is_favourite == True).count()
    geotagged = db.query(Photo).filter(Photo.user_id == current_user.id, Photo.latitude.isnot(None)).count()
    total_albums = db.query(Album).filter(Album.user_id == current_user.id).count()
    size_result = db.query(func.sum(Photo.file_size)).filter(Photo.user_id == current_user.id).scalar()
    total_size_bytes = size_result or 0

    return {
        "total_photos": total_photos,
        "total_videos": total_videos,
        "total_favourites": total_favourites,
        "geotagged_count": geotagged,
        "total_albums": total_albums,
        "total_size_bytes": total_size_bytes,
        "total_size_gb": round(total_size_bytes / (1024 ** 3), 2)
    }


@router.get("/", response_model=PhotoListResponse)
def list_photos(
    page: int = 1,
    limit: int = 50,
    filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Photo).filter(Photo.user_id == current_user.id)
    
    if filter == "favourites":
        query = query.filter(Photo.is_favourite == True)
    elif filter == "videos":
        query = query.filter(Photo.mime_type.startswith("video/"))
    elif filter == "screenshots":
        query = query.filter(
            Photo.filename.ilike("Screenshot%") | Photo.filename.ilike("%screenshot%")
        )
    elif filter == "no_album":
        subq = db.query(AlbumPhoto.photo_id)
        query = query.filter(~Photo.id.in_(subq))
    elif filter == "recently_added":
        cutoff = datetime.utcnow() - timedelta(days=30)
        query = query.filter(Photo.created_at >= cutoff)
    
    query = query.order_by(desc(Photo.canonical_date))
    total = query.count()
    photos = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "photos": [enrich_photo_response(p) for p in photos],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit else 1
    }


@router.get("/{photo_id}")
def get_photo(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo: raise HTTPException(status_code=404, detail="Photo not found")
    return enrich_photo_response(photo)


@router.patch("/{photo_id}/metadata")
def update_metadata(photo_id: str, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update editable metadata: title, description, tags."""
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo: raise HTTPException(status_code=404, detail="Photo not found")
    if "title" in data: photo.title = data["title"]
    if "description" in data: photo.description = data["description"]
    if "tags" in data:
        existing = dict(photo.exif_json) if photo.exif_json else {}
        existing["_tags"] = data["tags"]
        photo.exif_json = existing
    db.commit()
    db.refresh(photo)
    return enrich_photo_response(photo)


@router.patch("/{photo_id}/location")
def update_location(photo_id: str, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually set or update GPS coordinates for a photo."""
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    lat = data.get("latitude")
    lon = data.get("longitude")
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="latitude and longitude are required")
    if not (-90 <= float(lat) <= 90) or not (-180 <= float(lon) <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    photo.latitude = float(lat)
    photo.longitude = float(lon)
    db.commit()
    db.refresh(photo)
    return enrich_photo_response(photo)


@router.get("/{photo_id}/thumbnail/{size}")
def get_thumbnail(photo_id: str, size: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if size not in ["small", "medium", "large"]:
        raise HTTPException(status_code=400, detail="Invalid size. Use small, medium, or large.")
    
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    thumb_base = os.path.join(settings.STORAGE_PATH, "thumbnails", str(photo.id))
    requested_path = os.path.join(thumb_base, f"{size}.webp")
    
    # Serve the requested size if ready
    if os.path.exists(requested_path):
        return FileResponse(requested_path, media_type="image/webp",
                           headers={"Cache-Control": "public, max-age=31536000"})
    
    # Fallback: try another available size
    for fallback_size in ["medium", "large", "small"]:
        fallback_path = os.path.join(thumb_base, f"{fallback_size}.webp")
        if os.path.exists(fallback_path):
            return FileResponse(fallback_path, media_type="image/webp",
                               headers={"Cache-Control": "public, max-age=3600"})
    
    # Thumbnail not generated yet — for images serve original with 206 status
    # For videos, we can't serve the raw video as an img src, return 202 (still processing)
    if photo.mime_type and photo.mime_type.startswith("video/"):
        raise HTTPException(status_code=202, detail="Thumbnail processing")
    
    return FileResponse(photo.storage_path, status_code=206,
                       headers={"Cache-Control": "no-cache"})


@router.get("/{photo_id}/original")
def get_original(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo: raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(photo.storage_path)


@router.patch("/{photo_id}/favourite")
def toggle_favourite(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo: raise HTTPException(status_code=404, detail="Photo not found")
    
    photo.is_favourite = not photo.is_favourite
    db.commit()
    db.refresh(photo)
    return enrich_photo_response(photo)


@router.delete("/{photo_id}", status_code=204)
def delete_photo(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo: raise HTTPException(status_code=404, detail="Photo not found")
    
    db.query(AlbumPhoto).filter(AlbumPhoto.photo_id == photo.id).delete()
    
    albums_with_cover = db.query(Album).filter(Album.cover_photo_id == photo.id).all()
    for album in albums_with_cover:
        album.cover_photo_id = None
    
    if os.path.exists(photo.storage_path): 
        try:
            os.remove(photo.storage_path)
        except Exception:
            pass
            
    db.delete(photo)
    db.commit()
    return Response(status_code=204)
