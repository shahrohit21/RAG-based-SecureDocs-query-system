import numpy as np
import hashlib
import time
from typing import List
from backend.app.core.config import settings
from backend.app.core.logging import logger

class GeminiEmbedder:
    """
    Generates text embeddings using Google Gemini Embedding API or fallback generator.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.dimension = settings.EMBEDDING_DIMENSION

    def embed_text(self, text: str) -> List[float]:
        """
        Generates embedding vector for a single text query or chunk.
        Falls back to deterministic local embeddings if API is unavailable.
        """
        try:
            from backend.app.services.rag.client import get_genai_client
            client = get_genai_client()
            if client:
                response = client.models.embed_content(
                    model="text-embedding-004",
                    contents=text
                )
                if hasattr(response, 'embedding'):
                    return response.embedding.values
                elif hasattr(response, 'embeddings') and len(response.embeddings) > 0:
                    return response.embeddings[0].values
        except Exception as e:
            logger.warning(f"Gemini embedding API failed: {e}. Using fallback.")

        return self._generate_fallback_embedding(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embedding vectors for a list of text chunks using batch API calls.
        Sends multiple texts per API call to minimize requests.
        Rate-limits between batches to avoid Vertex AI quota crashes.
        """
        if not texts:
            return []

        try:
            from backend.app.services.rag.client import get_genai_client
            client = get_genai_client()
            if not client:
                print(f"[EMBED] No GenAI client available. Using fallback for all {len(texts)} chunks.", flush=True)
                return [self._generate_fallback_embedding(t) for t in texts]

            results = []
            # Vertex AI embed_content supports batch: pass list of texts in one call
            # Use batches of 20 texts per API call (API limit is ~100 per call)
            batch_size = 20
            total_batches = (len(texts) + batch_size - 1) // batch_size

            for batch_idx in range(0, len(texts), batch_size):
                batch = texts[batch_idx:batch_idx + batch_size]
                batch_num = batch_idx // batch_size + 1

                try:
                    # Send batch of texts in a single API call
                    response = client.models.embed_content(
                        model="text-embedding-004",
                        contents=batch
                    )

                    # Extract embeddings from batch response
                    if hasattr(response, 'embeddings') and response.embeddings:
                        for emb in response.embeddings:
                            results.append(emb.values)
                    elif hasattr(response, 'embedding'):
                        # Single result fallback
                        results.append(response.embedding.values)
                    else:
                        # Unexpected response format - fallback for this batch
                        for t in batch:
                            results.append(self._generate_fallback_embedding(t))

                    print(f"[EMBED] Batch {batch_num}/{total_batches} done ({len(results)}/{len(texts)} chunks)", flush=True)

                except Exception as e:
                    logger.warning(f"Batch {batch_num} embedding failed: {e}. Using fallback for {len(batch)} chunks.")
                    for t in batch:
                        results.append(self._generate_fallback_embedding(t))

                # Rate limit: pause between batches to avoid Vertex AI quota exhaustion
                if batch_idx + batch_size < len(texts):
                    time.sleep(0.3)

            return results

        except Exception as e:
            logger.warning(f"Embedding setup failed: {e}. Using fallback for all chunks.")
            return [self._generate_fallback_embedding(t) for t in texts]

    def _generate_fallback_embedding(self, text: str) -> List[float]:
        """
        Fallback deterministic embedding generator (768 dimensions)
        Used when GEMINI_API_KEY is not set or during offline testing.
        """
        seed = int(hashlib.md5(text.encode("utf-8")).hexdigest(), 16) % (2**32)
        rng = np.random.RandomState(seed)
        vec = rng.randn(self.dimension)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
