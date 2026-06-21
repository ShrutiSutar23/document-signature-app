from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.signature import Signature
from models.document import Document
from schemas.signature import SignatureCreate, SignatureResponse, SignatureUpdate
from middleware.auth_middleware import get_current_user
from models.user import User
from services.pdf_service import embed_signature_on_pdf
from services.audit_service import log_action
from typing import List
import os
import uuid

router = APIRouter(prefix="/api/signatures", tags=["Signatures"])

@router.post("", response_model=SignatureResponse)
def create_signature(
    request: Request,
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

    # Log action
    log_action(
        db,
        action="signature_placed",
        user_id=current_user.id,
        document_id=signature.document_id,
        details=f"Signature placed at x:{signature.x} y:{signature.y} page:{signature.page}",
        ip_address=request.client.host
    )

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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    password: str = None
):
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    signature = db.query(Signature).filter(
        Signature.document_id == doc_id,
        Signature.user_id == current_user.id
    ).order_by(Signature.id.desc()).first()

    if not signature:
        raise HTTPException(status_code=404, detail="No signature found for this document")

    output_filename = f"signed_{uuid.uuid4()}_{document.original_name}"

    signed_path = embed_signature_on_pdf(
        input_path=document.file_path,
        output_filename=output_filename,
        signer_name=current_user.name,
        x=signature.x,
        y=signature.y,
        page_number=signature.page,
        password=password
    )

    # Upload signed PDF to Supabase
    try:
        from services.storage_service import upload_file_to_supabase
        signed_public_url = upload_file_to_supabase(signed_path, f"signed/{output_filename}")
        # Remove local signed file
        if os.path.exists(signed_path):
            os.remove(signed_path)
    except Exception as e:
        signed_public_url = signed_path

    # Update status and store signed URL
    document.status = "signed"
    document.signed_file_url = signed_public_url
    signature.status = "signed"
    db.commit()

    # Log action
    log_action(
        db,
        action="document_signed",
        user_id=current_user.id,
        document_id=doc_id,
        details=f"Document signed by {current_user.name}",
        ip_address=request.client.host
    )

    return {
        "message": "Document signed successfully! ✅",
        "signed_file": output_filename,
        "download_url": signed_public_url
    }

@router.patch("/status/{signature_id}")
def update_signature_status(
    signature_id: int,
    update: SignatureUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.user_id == current_user.id
    ).first()

    if not signature:
        raise HTTPException(status_code=404, detail="Signature not found")

    # Validate status
    allowed_statuses = ["pending", "signed", "rejected"]
    if update.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed_statuses}")

    # Update signature
    signature.status = update.status
    if update.rejection_reason:
        signature.rejection_reason = update.rejection_reason

    # Update document status too
    document = db.query(Document).filter(
        Document.id == signature.document_id
    ).first()
    if document:
        document.status = update.status

    db.commit()

    # Log action
    log_action(
        db,
        action=f"signature_{update.status}",
        user_id=current_user.id,
        document_id=signature.document_id,
        details=f"Signature {update.status}" + (f" - Reason: {update.rejection_reason}" if update.rejection_reason else ""),
        ip_address=request.client.host
    )

    return {
        "message": f"Signature {update.status} successfully! ✅",
        "signature_id": signature_id,
        "status": update.status,
        "rejection_reason": update.rejection_reason
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