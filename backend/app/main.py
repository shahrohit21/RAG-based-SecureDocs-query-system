from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.session import engine, Base, init_db
from backend.app.models import user, document, document_chunk, chat, audit_log
from backend.app.api.auth import router as auth_router
from backend.app.api.documents import router as doc_router
from backend.app.api.chat import router as chat_router
from backend.app.api.analytics import router as analytics_router

# Initialize pgvector extension and create DB tables
init_db()
Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SecureDoc-RAG API",
    description="Enterprise-grade Secure Document Query System using RAG, PII Masking, and pgvector Supabase Multi-Tenant Isolation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Middleware
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print("=== UNHANDLED EXCEPTION TRACEBACK ===", flush=True)
    traceback.print_exc()
    logger.error(f"Global unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "error_type": type(exc).__name__
        }
    )

# Include Routers
app.include_router(auth_router)
app.include_router(doc_router)
app.include_router(chat_router)
app.include_router(analytics_router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
