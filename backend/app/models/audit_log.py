from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from backend.app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # e.g., AUTH_LOGIN, DOC_UPLOAD, DOC_DELETE, QUERY_EXECUTE
    ip_address = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")
