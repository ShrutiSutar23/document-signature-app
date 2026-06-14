from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Signature(Base):
    __tablename__ = "signatures"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    page = Column(Integer, default=1)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())