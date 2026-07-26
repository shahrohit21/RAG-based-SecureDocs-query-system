import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "SecureDoc-RAG"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./securedoc.db"
    
    # Authentication & Security
    JWT_SECRET: str = "securedoc_super_secret_jwt_key_change_in_production_32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # AI & Vector DB
    GEMINI_API_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "securedoc-index"
    EMBEDDING_DIMENSION: int = 768  # text-embedding-004 default
    
    # Rate Limiting & Storage
    MAX_UPLOAD_SIZE_MB: int = 15
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
