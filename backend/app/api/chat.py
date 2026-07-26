from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.chat import ChatMessage
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut
from backend.app.security.jwt import get_current_user
from backend.app.services.rag.retriever import SecureVectorRetriever
from backend.app.services.rag.generator import RAGGenerator

router = APIRouter(prefix="/api/chat", tags=["RAG Chat"])

retriever = SecureVectorRetriever()
generator = RAGGenerator()

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

    # 1. RETRIEVAL STEP: MANDATORY pgvector tenant filter: user_id == current_user.id
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

    # 3. Save Chat message in database
    chat_record = ChatMessage(
        user_id=current_user.id,
        question=question,
        answer=answer,
        confidence_score=confidence_score,
        source_chunks=retrieved_chunks
    )
    db.add(chat_record)

    # Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="QUERY_EXECUTE",
        details={
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
        question=question,
        answer=answer,
        referenced_documents=referenced_docs,
        retrieved_chunks=retrieved_chunks,
        confidence_score=confidence_score,
        created_at=chat_record.created_at
    )

@router.get("/history", response_model=List[ChatMessageOut])
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).all()
    return history

@router.delete("/history", status_code=status.HTTP_200_OK)
def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared successfully."}
