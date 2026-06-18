from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.invite import Invite
from models.document import Document
from schemas.invite import InviteCreate, InviteResponse
from middleware.auth_middleware import get_current_user
from models.user import User
from services.email_service import send_signing_link_email
from services.auth import create_signing_token
from services.audit_service import log_action
from typing import List
import os

router = APIRouter(prefix="/api/invites", tags=["Invites"])

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

@router.post("", response_model=InviteResponse)
async def create_invite(
    invite: InviteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate role
    allowed_roles = ["signer", "validator", "witness"]
    if invite.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of {allowed_roles}")

    # Get document
    document = db.query(Document).filter(
        Document.id == invite.document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate token for this invite
    token = create_signing_token(data={
        "doc_id": invite.document_id,
        "recipient": invite.email,
        "role": invite.role,
        "type": "invite_link"
    })

    # Create invite
    new_invite = Invite(
        document_id=invite.document_id,
        invited_by=current_user.id,
        name=invite.name,
        email=invite.email,
        role=invite.role,
        status="pending",
        token=token
    )
    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    # Generate signing link
    signing_link = f"{BASE_URL}/public-sign?token={token}"

    # Send email
    await send_signing_link_email(
        recipient_email=invite.email,
        document_name=document.original_name,
        signing_link=signing_link
    )

    # Log action
    log_action(
        db,
        action="invite_sent",
        user_id=current_user.id,
        document_id=invite.document_id,
        details=f"Invite sent to {invite.email} as {invite.role}",
        ip_address=request.client.host
    )

    return new_invite

@router.get("/{doc_id}", response_model=List[InviteResponse])
def get_invites(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invites = db.query(Invite).filter(
        Invite.document_id == doc_id,
        Invite.invited_by == current_user.id
    ).all()
    return invites
