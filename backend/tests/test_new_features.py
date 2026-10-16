import pytest
import uuid
from backend.app.database.session import SessionLocal, init_db, Base, engine
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chat_session import ChatSession
from backend.app.models.chat import ChatMessage
from backend.app.services.export_service import generate_chat_pdf, generate_chat_docx

@pytest.fixture
def db():
    init_db()
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def test_user(db):
    user_id = f"test_{uuid.uuid4()}"
    user = User(
        id=user_id,
        email=f"{user_id}@example.com",
        hashed_password="hashed_pw_test",
        full_name="Test User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_chat_session_management(db, test_user):
    # 1. Create chat sessions
    session1 = ChatSession(
        user_id=test_user.id,
        title="Session 1 - Financial Audit"
    )
    session2 = ChatSession(
        user_id=test_user.id,
        title="Session 2 - Tech Roadmap"
    )
    db.add(session1)
    db.add(session2)
    db.commit()

    # Verify sessions stored
    sessions = db.query(ChatSession).filter(ChatSession.user_id == test_user.id).all()
    assert len(sessions) == 2

    # 2. Add messages linked to session 1
    msg1 = ChatMessage(
        user_id=test_user.id,
        session_id=session1.id,
        question="What were the Q3 expenses?",
        answer="Q3 expenses were $1.2M according to financial records.",
        confidence_score=0.92,
        source_chunks=[{"chunk_id": "c1", "document_id": "d1", "filename": "q3_report.pdf", "similarity_score": 0.92, "content": "Sample"}]
    )
    db.add(msg1)
    db.commit()

    session1_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session1.id).all()
    assert len(session1_messages) == 1
    assert session1_messages[0].question == "What were the Q3 expenses?"

    # 3. Rename session
    session1.title = "Session 1 - Renamed"
    db.commit()
    db.refresh(session1)
    assert session1.title == "Session 1 - Renamed"

    # 4. Delete session 1 and verify cascade
    db.query(ChatMessage).filter(ChatMessage.session_id == session1.id).delete()
    db.delete(session1)
    db.commit()

    remaining_sessions = db.query(ChatSession).filter(ChatSession.user_id == test_user.id).all()
    assert len(remaining_sessions) == 1
    assert remaining_sessions[0].id == session2.id

def test_export_pdf_and_docx(db, test_user):
    # Prepare mock messages
    session = ChatSession(user_id=test_user.id, title="Architecture Review")
    db.add(session)
    db.commit()

    msg = ChatMessage(
        user_id=test_user.id,
        session_id=session.id,
        question="What is the architecture of SecureDoc-RAG?",
        answer="SecureDoc-RAG uses FastAPI, Google Gemini 2.5 Flash, and Pinecone vector storage.",
        confidence_score=0.98,
        source_chunks=[{"filename": "architecture.pdf", "similarity_score": 0.98}]
    )
    db.add(msg)
    db.commit()

    # Test PDF generation
    pdf_buf = generate_chat_pdf(session.title, test_user.email, [msg])
    assert pdf_buf is not None
    pdf_bytes = pdf_buf.getvalue()
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")

    # Test DOCX generation
    docx_buf = generate_chat_docx(session.title, test_user.email, [msg])
    assert docx_buf is not None
    docx_bytes = docx_buf.getvalue()
    assert len(docx_bytes) > 1000

def test_document_versioning(db, test_user):
    filename = "compliance_policy.pdf"

    # Version 1
    doc_v1 = Document(
        id=f"doc_v1_{uuid.uuid4()}",
        user_id=test_user.id,
        filename=f"v1_{filename}",
        original_name=filename,
        file_path="/tmp/v1.pdf",
        file_size=1024,
        chunk_count=3,
        status="processed",
        version=1,
        is_latest=True
    )
    db.add(doc_v1)
    db.commit()

    # Verify initial version
    docs = db.query(Document).filter(Document.user_id == test_user.id, Document.original_name == filename).all()
    assert len(docs) == 1
    assert docs[0].version == 1
    assert docs[0].is_latest is True

    # Simulate uploading Version 2
    existing_docs = (
        db.query(Document)
        .filter(Document.user_id == test_user.id, Document.original_name == filename)
        .order_by(Document.version.desc())
        .all()
    )
    new_version = existing_docs[0].version + 1
    assert new_version == 2

    # Archive previous version
    for prev in existing_docs:
        prev.is_latest = False
        prev.status = "archived"

    doc_v2 = Document(
        id=f"doc_v2_{uuid.uuid4()}",
        user_id=test_user.id,
        filename=f"v2_{filename}",
        original_name=filename,
        file_path="/tmp/v2.pdf",
        file_size=2048,
        chunk_count=5,
        status="processed",
        version=new_version,
        is_latest=True
    )
    db.add(doc_v2)
    db.commit()

    # Active documents (is_latest=True) should only return v2
    active_docs = db.query(Document).filter(
        Document.user_id == test_user.id,
        Document.original_name == filename,
        Document.is_latest == True
    ).all()
    assert len(active_docs) == 1
    assert active_docs[0].version == 2

    # All version history returns both v2 and v1
    all_versions = db.query(Document).filter(
        Document.user_id == test_user.id,
        Document.original_name == filename
    ).order_by(Document.version.desc()).all()
    assert len(all_versions) == 2
    assert all_versions[0].version == 2
    assert all_versions[1].version == 1
    assert all_versions[1].status == "archived"
