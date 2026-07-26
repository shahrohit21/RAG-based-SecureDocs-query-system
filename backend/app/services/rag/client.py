import os
import json
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger

# Module-level singleton cache
_genai_client = None
_client_initialized = False


def get_genai_client():
    """
    Returns a cached Google GenAI client instance (singleton).
    Initializes once using:
    1. Service Account JSON credentials for Vertex AI (preferred), OR
    2. GEMINI_API_KEY from environment configuration.
    Returns None if no valid credentials are available.
    """
    global _genai_client, _client_initialized

    if _client_initialized:
        return _genai_client

    _client_initialized = True  # Mark early to prevent re-entry on failure

    try:
        from google import genai

        # 1. Prefer Service Account credentials (Vertex AI)
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        default_cred_path = os.path.join(os.path.dirname(__file__), "../../core/credentials.json")

        if not cred_path and os.path.exists(default_cred_path):
            cred_path = os.path.abspath(default_cred_path)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

        if cred_path and os.path.exists(cred_path):
            try:
                with open(cred_path, "r", encoding="utf-8") as f:
                    cred_data = json.load(f)
                    project_id = cred_data.get("project_id")

                if project_id:
                    client = genai.Client(vertexai=True, project=project_id, location="us-central1")
                    _genai_client = client
                    logger.info(f"Google GenAI client initialized via Vertex AI (project: {project_id})")
                    return _genai_client
            except Exception as e:
                logger.warning(f"Vertex AI client init failed: {e}. Trying API key fallback...")

        # 2. Fallback to GEMINI_API_KEY
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                _genai_client = client
                logger.info("Google GenAI client initialized using API key.")
                return _genai_client
            except Exception as e:
                logger.warning(f"API key client init failed: {e}")

        # 3. No valid credentials found
        logger.warning("No valid GenAI credentials found. Embeddings and generation will use local fallbacks.")
        _genai_client = None
        return None

    except ImportError:
        logger.warning("google-genai package not installed. Using fallback embeddings.")
        _genai_client = None
        return None
    except Exception as e:
        logger.warning(f"Could not initialize Google GenAI Client: {str(e)}")
        _genai_client = None
        return None
