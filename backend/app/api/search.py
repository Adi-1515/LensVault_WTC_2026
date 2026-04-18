from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.database import get_db
from app.models.user import User
from app.models.photo import Photo
from app.api.auth import get_current_user
from app.api.photos import enrich_photo_response

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("/")
def search_photos(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Photo).filter(Photo.user_id == current_user.id)
    
    parts = q.strip().split(" ")
    text_terms = []
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        if part.startswith("type:"):
            typ = part.split(":", 1)[1]
            if typ == "video": query = query.filter(Photo.mime_type.startswith("video/"))
            elif typ in ("photo", "image"): query = query.filter(Photo.mime_type.startswith("image/"))
        elif part.startswith("favourite:") or part.startswith("favorite:"):
            val = part.split(":", 1)[1].lower() in ("true", "yes", "1")
            query = query.filter(Photo.is_favourite == val)
        elif part.startswith("taken:"):
            dates = part.split(":", 1)[1].split("..")
            if len(dates) == 2:
                query = query.filter(Photo.canonical_date >= dates[0], Photo.canonical_date <= dates[1])
            elif len(dates) == 1 and dates[0]:
                # Support year-only e.g. taken:2023
                year = dates[0]
                if len(year) == 4:
                    query = query.filter(
                        Photo.canonical_date >= f"{year}-01-01",
                        Photo.canonical_date <= f"{year}-12-31"
                    )
        elif part.startswith("camera:"):
            cam = part.split(":", 1)[1].replace('"', '')
            query = query.filter(Photo.exif_json["Model"].astext.ilike(f"%{cam}%"))
        elif part.startswith("tag:"):
            tag = part.split(":", 1)[1].replace('"', '')
            # Search tags stored in exif_json._tags list
            query = query.filter(Photo.exif_json["_tags"].astext.ilike(f"%{tag}%"))
        elif part.startswith("album:"):
            # Resolve album name search — return photo ids from matching albums
            # (simplified join approach)
            from app.models.photo import Album, AlbumPhoto
            album_name = part.split(":", 1)[1].replace('"', '')
            matching_albums = db.query(Album).filter(
                Album.user_id == current_user.id,
                Album.name.ilike(f"%{album_name}%")
            ).all()
            album_ids = [a.id for a in matching_albums]
            if album_ids:
                photo_ids_in_albums = db.query(AlbumPhoto.photo_id).filter(
                    AlbumPhoto.album_id.in_(album_ids)
                ).all()
                photo_ids = [p[0] for p in photo_ids_in_albums]
                query = query.filter(Photo.id.in_(photo_ids))
        else:
            # Free text — search filename, title, description
            text_terms.append(part)
    
    # Apply free text search
    for term in text_terms:
        query = query.filter(
            or_(
                Photo.filename.ilike(f"%{term}%"),
                Photo.title.ilike(f"%{term}%"),
                Photo.description.ilike(f"%{term}%"),
            )
        )
    
    photos = query.order_by(desc(Photo.canonical_date)).limit(200).all()
    
    return {
        "photos": [enrich_photo_response(p) for p in photos],
        "total": len(photos),
        "query": q
    }