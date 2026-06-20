from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    original_name: str
    file_size: int
    status: str
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentUpload(BaseModel):
    expires_days: Optional[int] = None