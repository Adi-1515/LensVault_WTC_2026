import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.photo import Album, AlbumPhoto, Photo
from app.models.face import Face, Person
from app.schemas.photo import AlbumCreate, AlbumResponse, AlbumDetailResponse
from app.api.auth import get_current_user
from app.api.photos import enrich_photo_response

router = APIRouter(prefix="/api/albums", tags=["albums"])

class MultiPersonAlbumRequest(BaseModel):
    person_ids: List[str]
    album_name: str

@router.get("/")
def get_albums(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    albums = db.query(Album).filter(Album.user_id == current_user.id).all()
    res = []
    for a in albums:
        count = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == a.id).count()
        
        # Get cover photo thumbnail url
        cover_url = None
        if a.cover_photo_id:
            cover_url = f"/api/photos/{a.cover_photo_id}/thumbnail/medium"
        elif count > 0:
            # Use first photo as cover
            first_link = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == a.id).order_by(AlbumPhoto.sort_order).first()
            if first_link:
                cover_url = f"/api/photos/{first_link.photo_id}/thumbnail/medium"
        
        res.append({
            "id": a.id, "name": a.name, "description": a.description,
            "cover_photo_id": a.cover_photo_id, "photo_count": count,
            "is_public": a.is_public, "share_token": a.share_token,
            "cover_url": cover_url,
            "album_type": a.album_type or "normal",
            "created_at": a.created_at
        })
    return res

@router.post("/", response_model=AlbumResponse)
def create_album(album_in: AlbumCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_album = Album(user_id=current_user.id, name=album_in.name, description=album_in.description)
    db.add(new_album)
    db.commit()
    db.refresh(new_album)
    return {**new_album.__dict__, "photo_count": 0}

@router.get("/{album_id}")
def get_album(album_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    album = db.query(Album).filter(Album.id == album_id, Album.user_id == current_user.id).first()
    if not album: raise HTTPException(status_code=404, detail="Album not found")
    
    photo_links = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == album.id).order_by(AlbumPhoto.sort_order).all()
    photo_ids = [pl.photo_id for pl in photo_links]
    photos = db.query(Photo).filter(Photo.id.in_(photo_ids)).all()
    
    # Maintain link sort order
    photo_map = {p.id: p for p in photos}
    ordered_photos = [photo_map[pid] for pid in photo_ids if pid in photo_map]
    
    return {
        **album.__dict__,
        "photo_count": len(photos),
        "photos": [enrich_photo_response(p) for p in ordered_photos]
    }

@router.patch("/{album_id}")
def update_album(album_id: str, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    album = db.query(Album).filter(Album.id == album_id, Album.user_id == current_user.id).first()
    if not album: raise HTTPException(status_code=404)
    if "name" in data: album.name = data["name"]
    if "description" in data: album.description = data["description"]
    if "cover_photo_id" in data: album.cover_photo_id = data["cover_photo_id"]
    db.commit()
    db.refresh(album)
    return album

@router.delete("/{album_id}", status_code=204)
def delete_album(album_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    album = db.query(Album).filter(Album.id == album_id, Album.user_id == current_user.id).first()
    if not album: raise HTTPException(status_code=404)
    db.query(AlbumPhoto).filter(AlbumPhoto.album_id == album.id).delete()
    db.delete(album)
    db.commit()
    return Response(status_code=204)

@router.post("/{album_id}/photos")
def add_photo_to_album(album_id: str, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    album = db.query(Album).filter(Album.id == album_id, Album.user_id == current_user.id).first()
    if not album: raise HTTPException(status_code=404)
    
    # Support both single photo_id and batch photo_ids
    photo_ids = data.get("photo_ids", [data.get("photo_id")] if "photo_id" in data else [])
    
    for photo_id in photo_ids:
        # Avoid duplicates
        existing = db.query(AlbumPhoto).filter(
            AlbumPhoto.album_id == album.id, AlbumPhoto.photo_id == photo_id
        ).first()
        if not existing:
            ap = AlbumPhoto(album_id=album.id, photo_id=photo_id)
            db.add(ap)
    
    db.commit()
    return {"status": "ok"}

@router.delete("/{album_id}/photos/{photo_id}", status_code=204)
def remove_photo(album_id: str, photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ap = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == album_id, AlbumPhoto.photo_id == photo_id).first()
    if ap:
        db.delete(ap)
        db.commit()
    return Response(status_code=204)

@router.post("/{album_id}/share")
def share_album(album_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate or revoke a share token for an album."""
    album = db.query(Album).filter(Album.id == album_id, Album.user_id == current_user.id).first()
    if not album: raise HTTPException(status_code=404)
    
    if album.is_public and album.share_token:
        # Revoke share
        album.is_public = False
        album.share_token = None
    else:
        # Generate share
        album.is_public = True
        album.share_token = secrets.token_urlsafe(32)
    
    db.commit()
    db.refresh(album)
    return {
        "is_public": album.is_public,
        "share_token": album.share_token,
        "share_url": f"/shared/{album.share_token}" if album.share_token else None
    }

@router.get("/shared/{token}")
def get_shared_album(token: str, db: Session = Depends(get_db)):
    """Public endpoint — no auth required — for viewing a shared album."""
    album = db.query(Album).filter(Album.share_token == token, Album.is_public == True).first()
    if not album: raise HTTPException(status_code=404, detail="Share link not found or revoked")
    
    photo_links = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == album.id).order_by(AlbumPhoto.sort_order).all()
    photo_ids = [pl.photo_id for pl in photo_links]
    photos = db.query(Photo).filter(Photo.id.in_(photo_ids)).all()
    photo_map = {p.id: p for p in photos}
    ordered_photos = [photo_map[pid] for pid in photo_ids if pid in photo_map]
    
    return {
        "album": {"id": album.id, "name": album.name, "description": album.description},
        "photos": [enrich_photo_response(p) for p in ordered_photos],
        "total": len(ordered_photos)
    }


@router.post("/multi-person")
def create_multi_person_album(
    data: MultiPersonAlbumRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a static album containing only photos where ALL selected people appear together."""
    person_ids = data.person_ids
    if len(person_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 people")

    # Validate all person_ids belong to current user
    persons = db.query(Person).filter(
        Person.id.in_(person_ids),
        Person.user_id == current_user.id
    ).all()
    if len(persons) != len(person_ids):
        raise HTTPException(status_code=400, detail="One or more people not found")

    person_names = [p.name for p in persons]

    # Intersection query: photos where ALL selected people appear
    photo_ids_query = (
        db.query(Face.photo_id)
        .filter(
            Face.person_id.in_(person_ids),
            Face.user_id == current_user.id
        )
        .group_by(Face.photo_id)
        .having(func.count(distinct(Face.person_id)) == len(person_ids))
    )
    photo_ids = [row[0] for row in photo_ids_query.all()]

    # Create the album with metadata for future recomputation
    album_name = data.album_name or " + ".join(person_names)
    new_album = Album(
        user_id=current_user.id,
        name=album_name,
        album_type="people_intersection",
        metadata_json={"person_ids": [str(pid) for pid in person_ids], "person_names": person_names}
    )
    db.add(new_album)
    db.flush()

    # Bulk insert photos into album
    for i, photo_id in enumerate(photo_ids):
        db.add(AlbumPhoto(album_id=new_album.id, photo_id=photo_id, sort_order=i))

    # Set cover photo
    if photo_ids:
        new_album.cover_photo_id = photo_ids[0]

    db.commit()
    db.refresh(new_album)

    return {"album_id": new_album.id, "photo_count": len(photo_ids)}