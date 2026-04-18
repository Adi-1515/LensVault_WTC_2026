import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Uuid as UUID, JSON as JSONB
from sqlalchemy.sql import func
from app.database import Base

class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    hash = Column(String(64), nullable=False, index=True)
    phash = Column(String(16), nullable=True)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    canonical_date = Column(DateTime, nullable=False, index=True)
    exif_json = Column(JSONB, nullable=True)
    latitude = Column(Float(precision=9), nullable=True)
    longitude = Column(Float(precision=9), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    is_favourite = Column(Boolean, default=False)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    thumbnail_status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Album(Base):
    __tablename__ = "albums"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cover_photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=True)
    is_public = Column(Boolean, default=False)
    share_token = Column(String(64), nullable=True)
    album_type = Column(String(50), default="normal", nullable=False)
    metadata_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AlbumPhoto(Base):
    __tablename__ = "album_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id"), nullable=False)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    added_at = Column(DateTime, default=func.now())
