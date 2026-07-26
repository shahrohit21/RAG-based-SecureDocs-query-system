from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from backend.app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    chunk_count = Column(Integer, default=0)
    pii_detected_count = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    status = Column(String(50), default="processed")  # processed, error, deleting
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="documents")
