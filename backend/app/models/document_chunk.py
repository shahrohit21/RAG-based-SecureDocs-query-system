from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from backend.app.database.session import Base
from backend.app.core.config import settings

def generate_uuid():
    return str(uuid.uuid4())

# Check if pgvector is available
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    
    # Store pgvector Vector(768) on PostgreSQL, fallback to JSON array on SQLite
    if HAS_PGVECTOR and not settings.DATABASE_URL.startswith("sqlite"):
        embedding = Column(Vector(settings.EMBEDDING_DIMENSION))
    else:
        embedding = Column(JSON)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    document = relationship("Document")
