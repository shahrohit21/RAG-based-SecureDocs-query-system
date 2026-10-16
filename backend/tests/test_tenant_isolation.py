import pytest
import uuid
from backend.app.services.rag.retriever import SecureVectorRetriever

def test_multi_tenant_data_isolation():
    retriever = SecureVectorRetriever()
    
    user1_id = f"user_{uuid.uuid4()}"
    user2_id = f"user_{uuid.uuid4()}"
    
    u1_chunk_id = f"u1_{uuid.uuid4()}"
    u2_chunk_id = f"u2_{uuid.uuid4()}"
    
    chunks_user1 = [
        {
            "id": u1_chunk_id,
            "text": "User 1 confidential revenue report for Q3 is $5 Million.",
            "metadata": {
                "user_id": user1_id,
                "document_id": f"doc_{user1_id}",
                "filename": "u1_report.pdf",
                "chunk_id": u1_chunk_id
            }
        }
    ]

    chunks_user2 = [
        {
            "id": u2_chunk_id,
            "text": "User 2 top secret design architecture blueprint for Quantum Project.",
            "metadata": {
                "user_id": user2_id,
                "document_id": f"doc_{user2_id}",
                "filename": "u2_blueprint.pdf",
                "chunk_id": u2_chunk_id
            }
        }
    ]

    # Store chunks for both users
    retriever.store_chunks(user_id=user1_id, chunks=chunks_user1)
    retriever.store_chunks(user_id=user2_id, chunks=chunks_user2)

    # 1. Query as User 1 seeking User 2's secret
    user1_results = retriever.retrieve_top_k(
        user_id=user1_id,
        question="What is the design architecture blueprint for Quantum Project?"
    )

    # Verify User 1 ONLY sees User 1 content, NEVER User 2 content
    for item in user1_results:
        assert item["document_id"] != "doc_u2"
        assert "Quantum Project" not in item["content"]

    # 2. Query as User 2 seeking User 1's revenue
    user2_results = retriever.retrieve_top_k(
        user_id=user2_id,
        question="What is the confidential revenue report for Q3?"
    )

    # Verify User 2 ONLY sees User 2 content, NEVER User 1 content
    for item in user2_results:
        assert item["document_id"] != "doc_u1"
        assert "$5 Million" not in item["content"]
