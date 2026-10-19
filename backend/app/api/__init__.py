"""
API Routers Package.
"""

from backend.app.api.auth import router as auth_router
from backend.app.api.documents import router as doc_router
from backend.app.api.chat import router as chat_router
from backend.app.api.analytics import router as analytics_router

__all__ = ["auth_router", "doc_router", "chat_router", "analytics_router"]
