from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.signature import Signature
from models.document import Document
from schemas.signature import SignatureCreate, SignatureResponse
from middleware.auth_middleware import get_current_user
from models.user import User
from services.pdf_service import embed_signature_on_pdf
from typing import List
import os
import uuid

router = APIRouter(prefix="/api/signatures", tags=["Signatures"])

@router.post("", response_model=SignatureResponse)
def create_signature(
    signature: SignatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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

@router.post("/finalize/{doc_id}")
def finalize_signature(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get document
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get latest signature
    signature = db.query(Signature).filter(
        Signature.document_id == doc_id,
        Signature.user_id == current_user.id
    ).order_by(Signature.id.desc()).first()

    if not signature:
        raise HTTPException(status_code=404, detail="No signature found for this document")

    # Generate signed PDF
    output_filename = f"signed_{uuid.uuid4()}_{document.original_name}"

    signed_path = embed_signature_on_pdf(
        input_path=document.file_path,
        output_filename=output_filename,
        signer_name=current_user.name,
        x=signature.x,
        y=signature.y,
        page_number=signature.page
    )

    # Update document status
    document.status = "signed"
    signature.status = "signed"
    db.commit()

    return {
        "message": "Document signed successfully! ✅",
        "signed_file": output_filename,
        "download_url": f"/api/signatures/download/{doc_id}"
    }

@router.get("/download/{doc_id}")
def download_signed_pdf(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != "signed":
        raise HTTPException(status_code=400, detail="Document is not signed yet")

    # Find signed file
    signed_dir = "signed_uploads"
    signed_files = [
        f for f in os.listdir(signed_dir)
        if document.original_name in f
    ]

    if not signed_files:
        raise HTTPException(status_code=404, detail="Signed file not found")

    signed_path = os.path.join(signed_dir, signed_files[-1])

    return FileResponse(
        signed_path,
        media_type="application/pdf",
        filename=f"signed_{document.original_name}"
    )