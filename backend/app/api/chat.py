from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.chat import ChatMessage
from backend.app.models.chat_session import ChatSession
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessageOut,
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionOut
)
from backend.app.security.jwt import get_current_user
from backend.app.services.rag.retriever import SecureVectorRetriever
from backend.app.services.rag.generator import RAGGenerator
from backend.app.services.export_service import generate_chat_pdf, generate_chat_docx

router = APIRouter(prefix="/api/chat", tags=["RAG Chat"])

retriever = SecureVectorRetriever()
generator = RAGGenerator()

# ==========================================
# 1. Multi-Chat Session Management Endpoints
# ==========================================

@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat conversation thread."""
    title = (session_data.title or "New Conversation").strip()
    session = ChatSession(
        user_id=current_user.id,
        title=title or "New Conversation"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionOut(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
        last_message_preview=None
    )

@router.get("/sessions", response_model=List[ChatSessionOut])
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all chat sessions for the current authenticated user."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    out_list = []
    for s in sessions:
        # Message count and last message preview
        msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        preview = last_msg.question[:50] + ("..." if len(last_msg.question) > 50 else "") if last_msg else None

        out_list.append(
            ChatSessionOut(
                id=s.id,
                user_id=s.user_id,
                title=s.title,
                created_at=s.created_at,
                updated_at=s.updated_at,
                message_count=msg_count,
                last_message_preview=preview
            )
        )
    return out_list

@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
def rename_chat_session(
    session_id: str,
    update_data: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rename a chat conversation thread."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )

    new_title = update_data.title.strip()
    if not new_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session title cannot be empty."
        )

    session.title = new_title
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()
    return ChatSessionOut(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=msg_count
    )

@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a chat session and all its associated messages."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )

    # Delete all messages in the session
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()

    return {"message": f"Chat session '{session.title}' and associated messages deleted successfully."}

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all messages for a specific chat session."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return messages


# ==========================================
# 2. RAG Query & Question Answering
# ==========================================

@router.post("", response_model=ChatResponse)
def ask_question(
    chat_req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = chat_req.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question text cannot be empty."
        )

    # Resolve or create ChatSession
    session = None
    if chat_req.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == chat_req.session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified chat session not found."
            )
    else:
        # Find latest session or auto-create one
        session = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id)
            .order_by(ChatSession.updated_at.desc())
            .first()
        )
        if not session:
            title_snippet = question[:40] + ("..." if len(question) > 40 else "")
            session = ChatSession(
                user_id=current_user.id,
                title=title_snippet
            )
            db.add(session)
            db.flush()

    # If session title is default "New Conversation", auto-update with question
    if session.title == "New Conversation":
        session.title = question[:40] + ("..." if len(question) > 40 else "")

    # 1. RETRIEVAL STEP: MANDATORY tenant filter: user_id == current_user.id
    retrieved_chunks = retriever.retrieve_top_k(
        user_id=current_user.id,
        question=question,
        top_k=4,
        db=db
    )

    # 2. GENERATION STEP: Gemini 2.5 Flash with Anti-Prompt-Injection prompt
    answer, confidence_score = generator.generate_answer(
        question=question,
        retrieved_chunks=retrieved_chunks
    )

    # Extract distinct referenced document names
    referenced_docs = list(set(c["filename"] for c in retrieved_chunks if c.get("filename")))

    # 3. Save Chat message in database with session_id
    chat_record = ChatMessage(
        user_id=current_user.id,
        session_id=session.id,
        question=question,
        answer=answer,
        confidence_score=confidence_score,
        source_chunks=retrieved_chunks
    )
    db.add(chat_record)

    # Update session's updated_at
    session.updated_at = datetime.now(timezone.utc)

    # Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="QUERY_EXECUTE",
        details={
            "session_id": session.id,
            "question_preview": question[:80],
            "chunks_retrieved": len(retrieved_chunks),
            "confidence": confidence_score
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(chat_record)

    return ChatResponse(
        id=chat_record.id,
        session_id=session.id,
        question=question,
        answer=answer,
        referenced_documents=referenced_docs,
        retrieved_chunks=retrieved_chunks,
        confidence_score=confidence_score,
        created_at=chat_record.created_at
    )


# ==========================================
# 3. History & Clear Endpoints
# ==========================================

@router.get("/history", response_model=List[ChatMessageOut])
def get_chat_history(
    session_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    
    history = query.order_by(ChatMessage.created_at.asc()).all()
    return history

@router.delete("/history", status_code=status.HTTP_200_OK)
def clear_chat_history(
    session_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    query.delete()
    db.commit()
    return {"message": "Chat history cleared successfully."}


# ==========================================
# 4. Export Conversation Report (PDF & DOCX)
# ==========================================

@router.get("/export")
def export_chat_report(
    session_id: Optional[str] = Query(None),
    format: str = Query("pdf", pattern="^(pdf|docx)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports the current conversation and Q&A summary as a downloadable PDF or DOCX report.
    """
    session_title = "All Recent Conversations"
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)

    if session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if session:
            session_title = session.title
            query = query.filter(ChatMessage.session_id == session_id)

    messages = query.order_by(ChatMessage.created_at.asc()).all()

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No conversation messages found to export."
        )

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    clean_title = "".join(c for c in session_title if c.isalnum() or c in (" ", "-", "_")).strip().replace(" ", "_")
    if not clean_title:
        clean_title = "Chat_Report"

    if format.lower() == "pdf":
        pdf_buffer = generate_chat_pdf(
            session_title=session_title,
            user_email=current_user.email,
            messages=messages
        )
        filename = f"SecureDoc_{clean_title}_{timestamp_str}.pdf"
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    else:
        docx_buffer = generate_chat_docx(
            session_title=session_title,
            user_email=current_user.email,
            messages=messages
        )
        filename = f"SecureDoc_{clean_title}_{timestamp_str}.docx"
        return Response(
            content=docx_buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
