from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatRequest(BaseModel):
    question: str

class SourceChunk(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    content: str
    similarity_score: float

class ChatResponse(BaseModel):
    id: str
    question: str
    answer: str
    referenced_documents: List[str]
    retrieved_chunks: List[SourceChunk]
    confidence_score: float
    created_at: datetime

class ChatMessageOut(BaseModel):
    id: str
    question: str
    answer: str
    confidence_score: float
    source_chunks: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True
