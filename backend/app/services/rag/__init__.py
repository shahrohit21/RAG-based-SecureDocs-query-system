"""
Retrieval-Augmented Generation (RAG) Engine Package.
"""

from backend.app.services.rag.chunker import DocumentChunker
from backend.app.services.rag.embedder import GeminiEmbedder
from backend.app.services.rag.generator import RAGGenerator
from backend.app.services.rag.loader import DocumentLoader
from backend.app.services.rag.masking import PIIMasker
from backend.app.services.rag.retriever import SecureVectorRetriever
from backend.app.services.rag.client import get_genai_client

__all__ = [
    "DocumentChunker",
    "GeminiEmbedder",
    "RAGGenerator",
    "DocumentLoader",
    "PIIMasker",
    "SecureVectorRetriever",
    "get_genai_client"
]
