from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid

class DocumentChunker:
    """
    Splits text into chunks using LangChain's RecursiveCharacterTextSplitter
    and attaches mandatory tenant metadata.
    """

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def create_chunks(
        self,
        masked_text: str,
        user_id: str,
        document_id: str,
        filename: str
    ) -> List[Dict[str, Any]]:
        """
        Splits text into chunks and returns a list of dictionaries with content & metadata.
        """
        raw_chunks = self.splitter.split_text(masked_text)
        timestamp = datetime.now(timezone.utc).isoformat()

        chunk_objects = []
        for idx, chunk_text in enumerate(raw_chunks):
            chunk_id = f"{document_id}_chunk_{idx}_{uuid.uuid4().hex[:6]}"
            metadata = {
                "user_id": str(user_id),
                "document_id": str(document_id),
                "filename": filename,
                "chunk_id": chunk_id,
                "chunk_index": idx,
                "uploaded_at": timestamp
            }
            chunk_objects.append({
                "id": chunk_id,
                "text": chunk_text,
                "metadata": metadata
            })

        return chunk_objects
