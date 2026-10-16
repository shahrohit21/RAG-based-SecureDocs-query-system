import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.document import DocumentOut, DocumentVersionOut, DocumentContentPreview
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

    # 2. Check for existing document versioning
    existing_docs = (
        db.query(Document)
        .filter(
            Document.user_id == current_user.id,
            Document.original_name == original_filename
        )
        .order_by(Document.version.desc())
        .all()
    )

    if existing_docs:
        new_version = (existing_docs[0].version or 1) + 1
        logger.info(f"Existing document '{original_filename}' found. Incrementing to version v{new_version}")
    else:
        new_version = 1

    # 3. Save upload file
    doc_uuid = str(uuid.uuid4())
    unique_filename = f"{current_user.id}_v{new_version}_{doc_uuid}_{original_filename}"
    saved_file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    try:
        print(f"[UPLOAD] Saving file {original_filename} (v{new_version})...", flush=True)
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(saved_file_path)
        if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            os.remove(saved_file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        print(f"[UPLOAD] Saved ({file_size} bytes)", flush=True)

        # 4. Extract text from file
        print(f"[UPLOAD] Extracting text...", flush=True)
        raw_text = DocumentLoader.extract_text(saved_file_path, file.content_type)
        if not raw_text or not raw_text.strip():
            os.remove(saved_file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Extracted document text is empty. Please upload a valid document."
            )

        # 5. PII Detection & Masking
        masked_text, pii_counts = PIIMasker.mask_text(raw_text)
        total_pii_detected = sum(pii_counts.values())

        # 6. Recursive Character Chunking
        chunks = chunker.create_chunks(
            masked_text=masked_text,
            user_id=current_user.id,
            document_id=doc_uuid,
            filename=original_filename
        )

        # 7. Document Versioning: Archive previous versions & replace vector embeddings
        if existing_docs:
            print(f"[VERSIONING] Archiving {len(existing_docs)} previous versions of {original_filename}...", flush=True)
            for prev_doc in existing_docs:
                prev_doc.is_latest = False
                if prev_doc.status == "processed":
                    prev_doc.status = "archived"
                # Archive / replace old vector embeddings in Pinecone & DB
                retriever.delete_document_vectors(user_id=current_user.id, document_id=prev_doc.id, db=db)
            
            existing_docs[0].superseded_by_id = doc_uuid

        # 8. Create Document Record
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
            status="processed",
            version=new_version,
            is_latest=True
        )
        db.add(db_doc)
        db.flush()

        # 9. Store Chunks in Vector Store with MANDATORY user_id metadata
        retriever.store_chunks(user_id=current_user.id, chunks=chunks, db=db)
        
        # Audit Log
        audit = AuditLog(
            user_id=current_user.id,
            action="DOC_UPLOAD",
            details={
                "document_id": doc_uuid,
                "filename": original_filename,
                "version": new_version,
                "file_size": file_size,
                "chunks": len(chunks),
                "pii_detected": pii_counts
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(db_doc)

        logger.info(f"Processed document {original_filename} v{new_version} ({len(chunks)} chunks, {total_pii_detected} PII masked) for user={current_user.id}")
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
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns user documents. By default, returns only active (is_latest=True) documents.
    If include_archived=True, returns all versions.
    """
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Document.is_latest == True)
    
    docs = query.order_by(Document.uploaded_at.desc()).all()
    return docs

@router.get("/{document_id}/history", response_model=List[DocumentVersionOut])
def get_document_version_history(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the version history for a given document file family.
    """
    target_doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not target_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    # Fetch all versions sharing the original_name
    history = (
        db.query(Document)
        .filter(
            Document.user_id == current_user.id,
            Document.original_name == target_doc.original_name
        )
        .order_by(Document.version.desc())
        .all()
    )
    return history

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
        pii_detected_count=doc.pii_detected_count,
        version=doc.version
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

    # 2. Delete vectors from vector store with user isolation
    retriever.delete_document_vectors(user_id=current_user.id, document_id=document_id, db=db)

    # 3. If deleting the latest version, check if there is an older version to promote to latest
    orig_name = doc.original_name
    is_latest = doc.is_latest
    doc_id = doc.id
    db.delete(doc)
    db.flush()

    if is_latest:
        remaining_latest = (
            db.query(Document)
            .filter(
                Document.user_id == current_user.id,
                Document.original_name == orig_name
            )
            .order_by(Document.version.desc())
            .first()
        )
        if remaining_latest:
            remaining_latest.is_latest = True
            remaining_latest.status = "processed"

    # Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="DOC_DELETE",
        details={"document_id": doc_id, "filename": orig_name}
    )
    db.add(audit)
    db.commit()

    logger.info(f"Deleted document {doc_id} ({orig_name}) for user={current_user.id}")
    return {"message": f"Document '{orig_name}' deleted successfully."}
