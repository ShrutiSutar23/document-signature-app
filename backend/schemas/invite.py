from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class InviteCreate(BaseModel):
    document_id: int
    name: str
    email: EmailStr
    role: str  # signer, validator, witness

class InviteResponse(BaseModel):
    id: int
    document_id: int
    invited_by: int
    name: str
    email: str
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True