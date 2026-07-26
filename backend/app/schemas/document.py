from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DocumentOut(BaseModel):
    id: str
    filename: str
    original_name: str
    file_size: int
    chunk_count: int
    pii_detected_count: int
    mime_type: Optional[str] = None
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DocumentContentPreview(BaseModel):
    id: str
    filename: str
    masked_preview: str
    chunk_count: int
    pii_detected_count: int
