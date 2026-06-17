from sqlalchemy.orm import Session
from models.audit import AuditLog

def log_action(
    db: Session,
    action: str,
    user_id: int = None,
    document_id: int = None,
    details: str = None,
    ip_address: str = None
):
    log = AuditLog(
        user_id=user_id,
        document_id=document_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()