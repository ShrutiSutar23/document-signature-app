from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.signature import Signature
from models.document import Document
from schemas.signature import SignatureCreate, SignatureResponse
from middleware.auth_middleware import get_current_user
from models.user import User
from typing import List

router = APIRouter(prefix="/api/signatures", tags=["Signatures"])

@router.post("", response_model=SignatureResponse)
def create_signature(
    signature: SignatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check document exists and belongs to user
    document = db.query(Document).filter(
        Document.id == signature.document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    new_signature = Signature(
        document_id=signature.document_id,
        user_id=current_user.id,
        x=signature.x,
        y=signature.y,
        page=signature.page,
        status="pending"
    )
    db.add(new_signature)
    db.commit()
    db.refresh(new_signature)
    return new_signature

@router.get("/{doc_id}", response_model=List[SignatureResponse])
def get_signatures(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    signatures = db.query(Signature).filter(
        Signature.document_id == doc_id,
        Signature.user_id == current_user.id
    ).all()
    return signatures