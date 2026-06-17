from fastapi import Request
from services.audit_service import log_action

# Call this inside any route that needs auditing:
# log_action(db, "document_uploaded", user_id=user.id, doc_id=doc.id,
#            ip=request.client.host, ua=request.headers.get("user-agent"))