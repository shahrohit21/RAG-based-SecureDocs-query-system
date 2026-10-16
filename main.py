"""
SecureDoc-RAG Application Entry Point.
Run directly via:
    python main.py
    uv run main.py
Or via Uvicorn CLI:
    uv run uvicorn backend.app.main:app --reload --port 8000
"""

import uvicorn

def run_server():
    print("🚀 Starting SecureDoc-RAG API Server on http://localhost:8000 ...")
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

if __name__ == "__main__":
    run_server()
