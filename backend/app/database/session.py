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
    if not settings.DATABASE_URL.startswith("sqlite"):
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
        except Exception as e:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
