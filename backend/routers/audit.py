from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.audit import AuditLog
from schemas.audit import AuditLogResponse
from middleware.auth_middleware import get_current_user
from models.user import User
from typing import List

router = APIRouter(prefix="/api/audit", tags=["Audit"])

@router.get("/{doc_id}", response_model=List[AuditLogResponse])
def get_audit_logs(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).filter(
        AuditLog.document_id == doc_id
    ).order_by(AuditLog.created_at.desc()).all()
    return logs

@router.get("", response_model=List[AuditLogResponse])
def get_all_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).all()
    return logs