import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.session import SessionLocal, engine
from backend.app.models.document_chunk import DocumentChunk
from backend.app.services.rag.embedder import GeminiEmbedder

# Fallback in-memory store for unit tests or offline standalone mode
_IN_MEMORY_VECTOR_STORE: List[Dict[str, Any]] = []

class SecureVectorRetriever:
    """
    Pinecone & pgvector Vector Store Retriever with STRICT Multi-Tenant Data Isolation.
    Every query MUST include user_id filter (user_id == current_user_id).
    """

    def __init__(self):
        self.embedder = GeminiEmbedder()
        self.use_pgvector = not settings.DATABASE_URL.startswith("sqlite")
        self.pinecone_index = self._init_pinecone()

    def _init_pinecone(self):
        """Initializes Pinecone client if API key is provided."""
        if not settings.PINECONE_API_KEY or not settings.PINECONE_API_KEY.strip():
            return None
        try:
            from pinecone import Pinecone
            pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            index = pc.Index(settings.PINECONE_INDEX)
            logger.info(f"Connected to Pinecone index: {settings.PINECONE_INDEX}")
            return index
        except Exception as e:
            logger.warning(f"Could not connect to Pinecone ({e}). Falling back to local/database vector store.")
            return None

    def store_chunks(self, user_id: str, chunks: List[Dict[str, Any]], db: Optional[Session] = None) -> int:
        """
        Embeds and stores document chunks into Pinecone and database table `document_chunks`.
        MANDATORY VERIFICATION: Every chunk stores user_id for tenant isolation.
        """
        if not chunks:
            return 0

        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            texts = [c["text"] for c in chunks]
            print(f"[STORE] Embedding {len(texts)} chunks...", flush=True)
            embeddings = self.embedder.embed_documents(texts)
            print(f"[STORE] Embedding done. Inserting into DB in batches...", flush=True)

            # 1. Store in Pinecone if configured
            if self.pinecone_index is not None:
                try:
                    pinecone_vectors = []
                    for c, emb in zip(chunks, embeddings):
                        metadata = c["metadata"]
                        pinecone_vectors.append({
                            "id": str(c["id"]),
                            "values": emb,
                            "metadata": {
                                "user_id": str(user_id),
                                "document_id": str(metadata.get("document_id")),
                                "filename": str(metadata.get("filename", "")),
                                "chunk_index": int(metadata.get("chunk_index", 0)),
                                "content": str(c["text"])[:1000]  # Pinecone metadata size safeguard
                            }
                        })
                    self.pinecone_index.upsert(vectors=pinecone_vectors)
                    logger.info(f"Upserted {len(pinecone_vectors)} chunks to Pinecone for user_id={user_id}")
                except Exception as pe:
                    logger.warning(f"Pinecone upsert failed: {pe}. Continuing with DB storage.")

            # 2. Insert into DB in batches of 10 to stay well under parameter limits
            batch_size = 10
            total_stored = 0

            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                batch_embeddings = embeddings[i:i + batch_size]

                for c, emb in zip(batch_chunks, batch_embeddings):
                    metadata = c["metadata"]

                    # MANDATORY SECURITY VERIFICATION
                    if metadata.get("user_id") != str(user_id):
                        raise ValueError("SECURITY VIOLATION: Chunk user_id does not match current user context!")

                    doc_chunk = DocumentChunk(
                        id=c["id"],
                        user_id=str(user_id),
                        document_id=metadata.get("document_id"),
                        filename=metadata.get("filename"),
                        chunk_index=metadata.get("chunk_index", 0),
                        content=c["text"],
                        embedding=emb
                    )
                    db.add(doc_chunk)

                db.flush()
                total_stored += len(batch_chunks)
                batch_num = i // batch_size + 1
                total_batches = (len(chunks) + batch_size - 1) // batch_size
                print(f"[STORE] Flushed batch {batch_num}/{total_batches} ({total_stored}/{len(chunks)} chunks)", flush=True)

            if close_db:
                db.commit()

            print(f"[STORE] All {total_stored} chunks flushed/stored.", flush=True)
            logger.info(f"Stored {total_stored} chunks for user_id={user_id}")
            return total_stored

        except Exception as e:
            if close_db:
                db.rollback()
            logger.error(f"store_chunks failed: {str(e)}")
            print(f"[STORE] ERROR: {type(e).__name__}: {e}", flush=True)
            raise

        finally:
            if close_db:
                db.close()

    def retrieve_top_k(self, user_id: str, question: str, top_k: int = 4, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        """
        MANDATORY SECURITY ENFORCEMENT:
        Retrieves top K matching chunks applying STRICT tenant filter: user_id == current_user_id.
        Returns document_id, chunk_id, filename, content, similarity_score, chunk_index.
        """
        if not str(user_id):
            raise ValueError("SECURITY ERROR: user_id is required for vector retrieval.")

        query_embedding = self.embedder.embed_text(question)

        # 1. Pinecone Retrieval if active
        if self.pinecone_index is not None:
            try:
                pc_res = self.pinecone_index.query(
                    vector=query_embedding,
                    top_k=top_k,
                    include_metadata=True,
                    filter={"user_id": {"$eq": str(user_id)}}  # STRICT TENANT FILTER
                )
                if pc_res and pc_res.matches:
                    results = []
                    for match in pc_res.matches:
                        meta = match.metadata or {}
                        results.append({
                            "chunk_id": match.id,
                            "document_id": meta.get("document_id", ""),
                            "filename": meta.get("filename", ""),
                            "content": meta.get("content", ""),
                            "similarity_score": round(float(match.score), 4) if match.score is not None else 0.5,
                            "chunk_index": int(meta.get("chunk_index", 0))
                        })
                    if results:
                        return results
            except Exception as pe:
                logger.warning(f"Pinecone query failed: {pe}. Falling back to DB search.")

        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            # 2. pgvector Search on PostgreSQL
            if self.use_pgvector:
                from pgvector.sqlalchemy import Vector

                # ABSOLUTE SECURITY TENANT FILTER
                query = (
                    db.query(
                        DocumentChunk,
                        (1 - DocumentChunk.embedding.cosine_distance(query_embedding)).label("similarity")
                    )
                    .filter(DocumentChunk.user_id == str(user_id))  # <--- SECURITY MANDATE
                    .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
                    .limit(top_k)
                )

                results = query.all()
                retrieved_chunks = []
                for chunk, sim in results:
                    retrieved_chunks.append({
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "filename": chunk.filename,
                        "content": chunk.content,
                        "similarity_score": round(float(sim), 4) if sim is not None else 0.5,
                        "chunk_index": getattr(chunk, "chunk_index", 0)
                    })

                if retrieved_chunks:
                    return retrieved_chunks

            # 3. SQLite / In-Database Chunk fallback with user_id filter
            user_chunks = db.query(DocumentChunk).filter(DocumentChunk.user_id == str(user_id)).all()
            if user_chunks:
                q_vec = np.array(query_embedding)
                q_norm = np.linalg.norm(q_vec)

                scored = []
                for chk in user_chunks:
                    if isinstance(chk.embedding, list):
                        doc_vec = np.array(chk.embedding)
                        doc_norm = np.linalg.norm(doc_vec)
                        sim = float(np.dot(q_vec, doc_vec) / (q_norm * doc_norm)) if (q_norm > 0 and doc_norm > 0) else 0.0
                    else:
                        sim = 0.5

                    scored.append({
                        "chunk_id": chk.id,
                        "document_id": chk.document_id,
                        "filename": chk.filename,
                        "content": chk.content,
                        "similarity_score": round(sim, 4),
                        "chunk_index": getattr(chk, "chunk_index", 0)
                    })

                scored.sort(key=lambda x: x["similarity_score"], reverse=True)
                return scored[:top_k]

        except Exception as e:
            logger.error(f"Vector query failed: {str(e)}. Using fallback memory store.")

        finally:
            if close_db and db:
                db.close()

        # 4. Fallback memory search for unit tests
        global _IN_MEMORY_VECTOR_STORE
        user_vectors = [v for v in _IN_MEMORY_VECTOR_STORE if v["metadata"].get("user_id") == str(user_id)]
        if not user_vectors:
            return []

        q_vec = np.array(query_embedding)
        q_norm = np.linalg.norm(q_vec)
        scored_chunks = []
        for v in user_vectors:
            doc_vec = np.array(v["values"])
            doc_norm = np.linalg.norm(doc_vec)
            sim = float(np.dot(q_vec, doc_vec) / (q_norm * doc_norm)) if (q_norm > 0 and doc_norm > 0) else 0.0
            scored_chunks.append({
                "chunk_id": v["id"],
                "document_id": v["metadata"].get("document_id"),
                "filename": v["metadata"].get("filename"),
                "content": v.get("content", ""),
                "similarity_score": round(sim, 4),
                "chunk_index": int(v["metadata"].get("chunk_index", 0))
            })

        scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_chunks[:top_k]

    def delete_document_vectors(self, user_id: str, document_id: str, db: Optional[Session] = None) -> bool:
        """
        Deletes/replaces all vector chunks belonging to a document, enforcing user_id tenant boundary.
        Works across Pinecone, pgvector, and SQLite.
        """
        # 1. Pinecone deletion if configured
        if self.pinecone_index is not None:
            try:
                self.pinecone_index.delete(
                    filter={
                        "user_id": {"$eq": str(user_id)},
                        "document_id": {"$eq": str(document_id)}
                    }
                )
                logger.info(f"Deleted Pinecone vectors for doc={document_id}, user={user_id}")
            except Exception as pe:
                logger.warning(f"Pinecone delete failed: {pe}")

        # 2. Database deletion
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            db.query(DocumentChunk).filter(
                DocumentChunk.user_id == str(user_id),
                DocumentChunk.document_id == str(document_id)
            ).delete(synchronize_session=False)
            db.commit()
            logger.info(f"Deleted database vector chunks for doc={document_id}, user={user_id}")
        except Exception as e:
            if db:
                db.rollback()
            logger.error(f"Vector chunks DB delete failed: {str(e)}")
        finally:
            if close_db and db:
                db.close()

        # 3. Fallback memory store deletion
        global _IN_MEMORY_VECTOR_STORE
        _IN_MEMORY_VECTOR_STORE = [
            v for v in _IN_MEMORY_VECTOR_STORE 
            if not (v["metadata"].get("user_id") == str(user_id) and v["metadata"].get("document_id") == str(document_id))
        ]
        return True
