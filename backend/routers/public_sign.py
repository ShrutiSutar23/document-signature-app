from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.document import Document
from models.invite import Invite
from services.email_service import send_signing_link_email
from services.auth import create_access_token, create_signing_token
from pydantic import BaseModel
from typing import Optional
from models.user import User
import os

router = APIRouter(prefix="/api/public", tags=["Public Signing"])

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

class SendSigningLinkRequest(BaseModel):
    document_id: int
    recipient_email: str

class UpdateInviteStatusRequest(BaseModel):
    token: str
    status: str
    rejection_reason: Optional[str] = None

@router.post("/send-signing-link")
async def send_signing_link(
    request: SendSigningLinkRequest,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == request.document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    token = create_signing_token(
        data={
            "doc_id": request.document_id,
            "recipient": request.recipient_email,
            "type": "signing_link",
            "role": "signer"
        }
    )

    signing_link = f"{BASE_URL}/public-sign?token={token}"

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

    if payload.get("type") not in ["signing_link", "invite_link"]:
        raise HTTPException(status_code=401, detail="Invalid token type")

    doc_id = payload.get("doc_id")
    document = db.query(Document).filter(Document.id == doc_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": doc_id,
        "document_name": document.original_name,
        "recipient": payload.get("recipient"),
        "role": payload.get("role", "signer")
    }

@router.post("/complete-action")
async def complete_action(
    request: UpdateInviteStatusRequest,
    db: Session = Depends(get_db)
):
    from services.auth import verify_token
    from services.email_service import send_notification_email

    payload = verify_token(request.token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Update invite status
    invite = db.query(Invite).filter(
        Invite.token == request.token
    ).first()

    if invite:
        invite.status = request.status
        if request.rejection_reason:
            invite.status = "rejected"
        db.commit()

        # Get document
        document = db.query(Document).filter(
            Document.id == invite.document_id
        ).first()

        # Get document owner
        if document:
            owner = db.query(User).filter(
                User.id == document.user_id
            ).first()

            # Send notification to document owner
            if owner:
                action_text = {
                    "signed": "✍️ Signed the document",
                    "approved": "✅ Approved the document",
                    "rejected": "❌ Rejected the document",
                    "witnessed": "👁️ Witnessed the document signing"
                }.get(request.status, request.status)

                await send_notification_email(
                    recipient_email=owner.email,
                    document_name=document.original_name,
                    signer_name=invite.name,
                    action=action_text
                )

    return {"message": f"Action completed: {request.status} ✅"}