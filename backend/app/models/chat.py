from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from backend.app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.0)
    source_chunks = Column(JSON, nullable=True)  # List of referenced document chunks & metadata
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chat_messages")
