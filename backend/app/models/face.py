import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Uuid as UUID, JSON as JSONB, LargeBinary, Index
from sqlalchemy.sql import func
from app.database import Base

class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now())


class Face(Base):
    __tablename__ = "faces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bounding_box = Column(JSONB, nullable=False) # [x, y, w, h]
    embedding = Column(LargeBinary, nullable=False) # pickled numpy array of shape (512,)
    cluster_id = Column(Integer, nullable=True, index=True) # DBSCAN group
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index('ix_faces_person_photo', 'person_id', 'photo_id'),
    )
