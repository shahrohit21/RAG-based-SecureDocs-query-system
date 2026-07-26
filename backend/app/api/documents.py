import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.document import DocumentOut, DocumentContentPreview
from backend.app.security.jwt import get_current_user
from backend.app.services.rag.loader import DocumentLoader
from backend.app.services.rag.masking import PIIMasker
from backend.app.services.rag.chunker import DocumentChunker
from backend.app.services.rag.retriever import SecureVectorRetriever

router = APIRouter(prefix="/api/documents", tags=["Documents"])

retriever = SecureVectorRetriever()
chunker = DocumentChunker()

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate file extension
    original_filename = file.filename or "unnamed_document"
    ext = os.path.splitext(original_filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".txt", ".md"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(allowed_exts)}"
        )

    # 2. Save temporary upload file
    doc_uuid = str(uuid.uuid4())
    unique_filename = f"{current_user.id}_{doc_uuid}_{original_filename}"
    saved_file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    try:
        print(f"[UPLOAD] Step 1: Saving file {original_filename}...", flush=True)
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(saved_file_path)
        if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            os.remove(saved_file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        print(f"[UPLOAD] Step 1 DONE: File saved ({file_size} bytes)", flush=True)

        # 3. Extract text from file
        print(f"[UPLOAD] Step 2: Extracting text...", flush=True)
        raw_text = DocumentLoader.extract_text(saved_file_path, file.content_type)
        if not raw_text or not raw_text.strip():
            os.remove(saved_file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Extracted document text is empty. Please upload a valid document."
            )
        print(f"[UPLOAD] Step 2 DONE: Extracted {len(raw_text)} chars", flush=True)

        # 4. PII Detection & Masking
        print(f"[UPLOAD] Step 3: PII masking...", flush=True)
        masked_text, pii_counts = PIIMasker.mask_text(raw_text)
        total_pii_detected = sum(pii_counts.values())
        print(f"[UPLOAD] Step 3 DONE: {total_pii_detected} PII entities masked", flush=True)

        # 5. Recursive Character Chunking
        print(f"[UPLOAD] Step 4: Chunking...", flush=True)
        chunks = chunker.create_chunks(
            masked_text=masked_text,
            user_id=current_user.id,
            document_id=doc_uuid,
            filename=original_filename
        )
        print(f"[UPLOAD] Step 4 DONE: {len(chunks)} chunks created", flush=True)

        # 6. Create Document Record FIRST (so foreign key constraint passes)
        print(f"[UPLOAD] Step 5: Creating DB Document record...", flush=True)
        db_doc = Document(
            id=doc_uuid,
            user_id=current_user.id,
            filename=unique_filename,
            original_name=original_filename,
            file_path=saved_file_path,
            file_size=file_size,
            chunk_count=len(chunks),
            pii_detected_count=total_pii_detected,
            mime_type=file.content_type or ext[1:],
            status="processed"
        )
        db.add(db_doc)
        db.flush()  # Ensures document_id exists for foreign key constraint!

        # 7. Store Chunks in Vector Store with MANDATORY user_id metadata
        print(f"[UPLOAD] Step 6: Embedding + storing {len(chunks)} chunks...", flush=True)
        retriever.store_chunks(user_id=current_user.id, chunks=chunks, db=db)
        print(f"[UPLOAD] Step 6 DONE: Chunks stored in vector DB", flush=True)
        
        # Audit Log
        audit = AuditLog(
            user_id=current_user.id,
            action="DOC_UPLOAD",
            details={
                "document_id": doc_uuid,
                "filename": original_filename,
                "file_size": file_size,
                "chunks": len(chunks),
                "pii_detected": pii_counts
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(db_doc)

        print(f"[UPLOAD] Step 7 DONE: All complete!", flush=True)
        logger.info(f"Successfully processed document {original_filename} ({len(chunks)} chunks, {total_pii_detected} PII masked) for user={current_user.id}")
        return db_doc

    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPLOAD] EXCEPTION: {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        if os.path.exists(saved_file_path):
            os.remove(saved_file_path)
        logger.error(f"Error processing document upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the document: {str(e)}"
        )

@router.get("", response_model=List[DocumentOut])
def get_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.uploaded_at.desc()).all()
    return docs

@router.get("/{document_id}/view", response_model=DocumentContentPreview)
def view_document_content(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id  # Strict owner check
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    try:
        raw_text = DocumentLoader.extract_text(doc.file_path, doc.mime_type)
        masked_text, _ = PIIMasker.mask_text(raw_text)
        preview_text = masked_text[:2500] + ("\n...[Truncated Preview]..." if len(masked_text) > 2500 else "")
    except Exception as e:
        preview_text = "Unable to read stored file content."

    return DocumentContentPreview(
        id=doc.id,
        filename=doc.original_name,
        masked_preview=preview_text,
        chunk_count=doc.chunk_count,
        pii_detected_count=doc.pii_detected_count
    )

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure document belongs strictly to current_user
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    # 1. Delete physical file if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.warning(f"Could not remove file {doc.file_path}: {str(e)}")

    # 2. Delete vectors from pgvector store with user isolation
    retriever.delete_document_vectors(user_id=current_user.id, document_id=document_id, db=db)

    # 3. Delete database record
    filename = doc.original_name
    db.delete(doc)

    # Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="DOC_DELETE",
        details={"document_id": document_id, "filename": filename}
    )
    db.add(audit)
    db.commit()

    logger.info(f"Deleted document {document_id} ({filename}) for user={current_user.id}")
    return {"message": f"Document '{filename}' deleted successfully."}
