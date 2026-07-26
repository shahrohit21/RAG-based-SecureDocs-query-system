from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
