from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chat import ChatMessage
from backend.app.models.audit_log import AuditLog
from backend.app.security.jwt import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Total Documents
    total_docs = db.query(func.count(Document.id)).filter(Document.user_id == current_user.id).scalar() or 0

    # 2. Total Queries
    total_queries = db.query(func.count(ChatMessage.id)).filter(ChatMessage.user_id == current_user.id).scalar() or 0

    # 3. Total Storage Used (Bytes -> MB)
    total_bytes = db.query(func.sum(Document.file_size)).filter(Document.user_id == current_user.id).scalar() or 0
    storage_mb = round(total_bytes / (1024 * 1024), 2)

    # 4. Total PII Masked Count
    total_pii = db.query(func.sum(Document.pii_detected_count)).filter(Document.user_id == current_user.id).scalar() or 0

    # 5. Total Chunks
    total_chunks = db.query(func.sum(Document.chunk_count)).filter(Document.user_id == current_user.id).scalar() or 0

    # 6. Recent Activity (last 6 audit logs)
    recent_logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(6).all()

    activity_feed = [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.created_at.isoformat()
        }
        for log in recent_logs
    ]

    return {
        "total_documents": total_docs,
        "total_queries": total_queries,
        "storage_used_mb": storage_mb,
        "pii_masked_count": total_pii,
        "total_chunks": total_chunks,
        "recent_activity": activity_feed
    }
