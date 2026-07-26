import fitz  # PyMuPDF
import docx
import os
from fastapi import HTTPException, status
from backend.app.core.logging import logger

class DocumentLoader:
    """
    Parses and extracts raw text from PDF, DOCX, and TXT files.
    """

    @staticmethod
    def extract_text(file_path: str, mime_type: str = None) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == ".pdf" or mime_type == "application/pdf":
                return DocumentLoader._extract_from_pdf(file_path)
            elif ext == ".docx" or mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return DocumentLoader._extract_from_docx(file_path)
            elif ext in [".txt", ".md", ".csv", ".json"] or (mime_type and mime_type.startswith("text/")):
                return DocumentLoader._extract_from_txt(file_path)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file extension '{ext}'. Only PDF, DOCX, and TXT are supported."
                )
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to extract document text: {str(e)}"
            )

    @staticmethod
    def _extract_from_pdf(file_path: str) -> str:
        doc = fitz.open(file_path)
        extracted_pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            extracted_pages.append(page.get_text("text"))
        doc.close()
        return "\n\n".join(extracted_pages)

    @staticmethod
    def _extract_from_docx(file_path: str) -> str:
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)

    @staticmethod
    def _extract_from_txt(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
