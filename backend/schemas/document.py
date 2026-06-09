from pydantic import BaseModel
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    original_name: str
    file_size: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True