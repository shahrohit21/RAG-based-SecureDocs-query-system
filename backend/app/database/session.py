from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

# Handle SQLite connect_args if needed
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    import backend.app.models  # Ensure all models are registered in SQLAlchemy Base
    from sqlalchemy import text
    if not settings.DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS superseded_by_id VARCHAR(36);"))
                conn.commit()
        except Exception as e:
            pass
    else:
        try:
            with engine.connect() as conn:
                # 1. Check chat_messages table
                try:
                    chat_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(chat_messages);")).fetchall()]
                    if chat_cols and "session_id" not in chat_cols:
                        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN session_id VARCHAR(36);"))
                except Exception:
                    pass

                # 2. Check documents table
                try:
                    doc_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(documents);")).fetchall()]
                    if doc_cols:
                        if "version" not in doc_cols:
                            conn.execute(text("ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1;"))
                        if "is_latest" not in doc_cols:
                            conn.execute(text("ALTER TABLE documents ADD COLUMN is_latest BOOLEAN DEFAULT 1;"))
                        if "superseded_by_id" not in doc_cols:
                            conn.execute(text("ALTER TABLE documents ADD COLUMN superseded_by_id VARCHAR(36);"))
                except Exception:
                    pass
                conn.commit()
        except Exception as e:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
