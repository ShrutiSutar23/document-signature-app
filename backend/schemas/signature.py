from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SignatureCreate(BaseModel):
    document_id: int
    x: float
    y: float
    page: int = 1

class SignatureResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    x: float
    y: float
    page: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class SignatureUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None