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
    version: int = 1
    is_latest: bool = True
    superseded_by_id: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DocumentVersionOut(BaseModel):
    id: str
    filename: str
    original_name: str
    file_size: int
    chunk_count: int
    pii_detected_count: int
    mime_type: Optional[str] = None
    status: str
    version: int
    is_latest: bool
    superseded_by_id: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DocumentContentPreview(BaseModel):
    id: str
    filename: str
    masked_preview: str
    chunk_count: int
    pii_detected_count: int
    version: Optional[int] = 1
