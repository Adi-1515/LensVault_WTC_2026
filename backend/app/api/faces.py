import os
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, cast, String
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.face import Face, Person
from app.models.photo import Photo
from app.config import settings
from app.workers.tasks import run_clustering
from app.api.photos import enrich_photo_response

router = APIRouter(prefix="/api/faces", tags=["faces"])

class AssignClusterRequest(BaseModel):
    name: str

@router.get("/clusters")
def get_clusters(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return unassigned clusters with a sample face."""
    clusters = db.query(
        Face.cluster_id,
        func.count(Face.id).label("count"),
        func.max(cast(Face.id, String)).label("sample_face_id") # Use the latest face ID as sample
    ).filter(
        Face.user_id == current_user.id,
        Face.cluster_id.isnot(None),
        Face.person_id.is_(None)
    ).group_by(Face.cluster_id).order_by(desc("count")).all()
    
    result = []
    for c in clusters:
        result.append({
            "cluster_id": c.cluster_id,
            "face_count": c.count,
            "sample_face_id": c.sample_face_id
        })
    return result

@router.get("/persons")
def get_persons(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return list of known labeled people."""
    persons = db.query(Person).filter(Person.user_id == current_user.id).order_by(Person.name).all()
    result = []
    for p in persons:
        # Get a sample face for this person
        sample_face = db.query(Face).filter(Face.person_id == p.id).first()
        result.append({
            "id": p.id,
            "name": p.name,
            "sample_face_id": sample_face.id if sample_face else None
        })
    return result

@router.post("/clusters/{cluster_id}/assign")
def assign_cluster(
    cluster_id: int, 
    data: AssignClusterRequest,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Assign a name to a cluster, mapping it to a Person."""
    # check if person exists by name
    person = db.query(Person).filter(
        func.lower(Person.name) == data.name.lower(), 
        Person.user_id == current_user.id
    ).first()
    
    if not person:
        person = Person(user_id=current_user.id, name=data.name)
        db.add(person)
        db.flush()
    
    faces = db.query(Face).filter(Face.cluster_id == cluster_id, Face.user_id == current_user.id).all()
    for f in faces:
        f.person_id = person.id
        
    db.commit()
    return {"message": "Success", "person_id": person.id}

@router.get("/persons/{person_id}/photos")
def get_person_photos(
    person_id: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Return all photos containing this person."""
    person = db.query(Person).filter(Person.id == person_id, Person.user_id == current_user.id).first()
    if not person: raise HTTPException(status_code=404, detail="Person not found")
    
    # Find distinct photo IDs first to avoid PostgreSQL JSON equality errors
    photo_ids_query = db.query(Face.photo_id).filter(
        Face.person_id == person_id,
        Face.user_id == current_user.id
    ).distinct()
    
    photo_ids = [row[0] for row in photo_ids_query.all()]
    
    if not photo_ids:
        photos = []
    else:
        photos = db.query(Photo).filter(
            Photo.id.in_(photo_ids),
            Photo.user_id == current_user.id
        ).order_by(desc(Photo.canonical_date)).all()
    
    return {
        "person": {"id": person.id, "name": person.name},
        "photos": [enrich_photo_response(p) for p in photos],
        "total": len(photos)
    }

@router.post("/cluster")
def trigger_clustering(current_user: User = Depends(get_current_user)):
    """Trigger the background celery task to cluster faces."""
    run_clustering.delay(str(current_user.id))
    return {"message": "Clustering started"}

@router.get("/{face_id}/image")
def get_face_image(face_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    face = db.query(Face).filter(Face.id == face_id, Face.user_id == current_user.id).first()
    if not face: raise HTTPException(status_code=404, detail="Face not found")
    
    face_path = os.path.join(settings.STORAGE_PATH, "faces", f"{face.id}.webp")
    if os.path.exists(face_path):
        return FileResponse(face_path, media_type="image/webp", headers={"Cache-Control": "public, max-age=31536000"})
    
    raise HTTPException(status_code=404, detail="Face image not extracted yet")
