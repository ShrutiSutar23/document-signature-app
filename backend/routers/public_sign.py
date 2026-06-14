from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.document import Document
from models.signature import Signature
from models.user import User
from services.email_service import send_signing_link_email
from services.auth import create_access_token
from pydantic import BaseModel
from datetime import timedelta
import os

router = APIRouter(prefix="/api/public", tags=["Public Signing"])

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

class SendSigningLinkRequest(BaseModel):
    document_id: int
    recipient_email: str

@router.post("/send-signing-link")
async def send_signing_link(
    request: SendSigningLinkRequest,
    db: Session = Depends(get_db)
):
    # Get document
    document = db.query(Document).filter(
        Document.id == request.document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate signing token
    token = create_access_token(
        data={
            "doc_id": request.document_id,
            "recipient": request.recipient_email,
            "type": "signing_link"
        }
    )

    # Generate signing link
    signing_link = f"{BASE_URL}/public-sign?token={token}"

    # Send email
    await send_signing_link_email(
        recipient_email=request.recipient_email,
        document_name=document.original_name,
        signing_link=signing_link
    )

    return {
        "message": "Signing link sent successfully! ✅",
        "signing_link": signing_link
    }

@router.get("/verify-token/{token}")
def verify_signing_token(token: str, db: Session = Depends(get_db)):
    from services.auth import verify_token
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("type") != "signing_link":
        raise HTTPException(status_code=401, detail="Invalid token type")

    doc_id = payload.get("doc_id")
    document = db.query(Document).filter(Document.id == doc_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": doc_id,
        "document_name": document.original_name,
        "recipient": payload.get("recipient")
    }