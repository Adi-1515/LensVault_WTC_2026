from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime

class PhotoResponse(BaseModel):
    id: UUID
    user_id: UUID
    hash: str
    phash: Optional[str]
    filename: str
    mime_type: str
    file_size: int
    canonical_date: datetime
    exif_json: Optional[Any]
    latitude: Optional[float]
    longitude: Optional[float]
    width: Optional[int]
    height: Optional[int]
    is_favourite: bool
    title: Optional[str]
    description: Optional[str]
    thumbnail_status: str
    created_at: datetime
    updated_at: datetime
    thumbnail_url: str

    class Config:
        from_attributes = True

class PhotoListResponse(BaseModel):
    photos: List[PhotoResponse]
    total: int
    page: int
    pages: int

class AlbumCreate(BaseModel):
    name: str
    description: Optional[str] = None

class AlbumResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    cover_photo_id: Optional[UUID]
    photo_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class AlbumDetailResponse(AlbumResponse):
    photos: List[PhotoResponse]

class SearchResponse(BaseModel):
    photos: List[PhotoResponse]
    total: int
    query: str
