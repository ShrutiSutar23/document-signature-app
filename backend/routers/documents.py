from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.document import Document
from models.signature import Signature
from models.audit import AuditLog
from schemas.document import DocumentResponse
from middleware.auth_middleware import get_current_user
from models.user import User
from services.audit_service import log_action
import os
import uuid
import aiofiles

router = APIRouter(prefix="/api/docs", tags=["Documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    expires_days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    # Calculate expiry date
    from datetime import datetime, timedelta, timezone
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    document = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        status="pending",
        expires_at=expires_at
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Log action
    log_action(
        db,
        action="document_uploaded",
        user_id=current_user.id,
        document_id=document.id,
        details=f"Document uploaded: {file.filename} expires in {expires_days} days",
        ip_address=request.client.host
    )

    return document

@router.get("", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).filter(
        Document.user_id == current_user.id
    ).all()
    return documents

@router.get("/file/{doc_id}")
def get_document_file(
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

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        document.file_path,
        media_type="application/pdf",
        filename=document.original_name,
        headers={"Content-Disposition": f'inline; filename="{document.original_name}"'}
    )

@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    db.query(Signature).filter(Signature.document_id == doc_id).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.document_id == doc_id).delete(synchronize_session=False)
    db.delete(document)
    db.commit()

    try:
        if document.file_path and os.path.exists(document.file_path):
            os.remove(document.file_path)
    except OSError:
        pass

    log_action(
        db,
        action="document_deleted",
        user_id=current_user.id,
        document_id=document.id,
        details=f"Deleted document: {document.original_name}",
        ip_address=request.client.host if request.client else None
    )

    return {"detail": "Document deleted successfully"}

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
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

    return document

@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Delete related signatures first
        from models.signature import Signature
        from models.audit import AuditLog
        from models.invite import Invite

        db.query(Signature).filter(Signature.document_id == doc_id).delete()
        db.query(AuditLog).filter(AuditLog.document_id == doc_id).delete()
        db.query(Invite).filter(Invite.document_id == doc_id).delete()

        # Delete file from disk
        if os.path.exists(document.file_path):
            os.remove(document.file_path)

        # Delete document
        db.delete(document)
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

    return {"message": "Document deleted successfully! ✅"}