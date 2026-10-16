from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class ChatSessionUpdate(BaseModel):
    title: str

class ChatSessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0
    last_message_preview: Optional[str] = None

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None

class SourceChunk(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    content: str
    similarity_score: float
    chunk_index: Optional[int] = 0

class ChatResponse(BaseModel):
    id: str
    session_id: Optional[str] = None
    question: str
    answer: str
    referenced_documents: List[str]
    retrieved_chunks: List[SourceChunk]
    confidence_score: float
    created_at: datetime

class ChatMessageOut(BaseModel):
    id: str
    session_id: Optional[str] = None
    question: str
    answer: str
    confidence_score: float
    source_chunks: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True
