# Use the OS certificate store for TLS (handles HTTPS-inspecting antivirus/proxies).
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

import logging
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

from routes import video, notes, quiz, assignment, flashcard, tutor
from services.vectordb import vectordb_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vidyastra ML Service API",
    description="Modular Multimodal RAG Backend for Lecture Intelligence",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _warm_up_vectordb():
    # Runs in a background thread: a failure is logged and the model then loads on first use instead.
    start = time.perf_counter()
    try:
        vectordb_service.warm_up()
    except Exception:
        logger.exception("warm-up failed after %.1fs; the embedding model will load on the first request", time.perf_counter() - start)
        return
    logger.info("warm-up complete in %.1fs", time.perf_counter() - start)

@app.on_event("startup")
def startup_event():
    logger.info("Verifying and creating storage layout directories...")
    settings.ensure_directories()
    # Not awaited, so /health responds immediately while the model loads.
    logger.info("Warming up embedding model and Chroma collection in the background...")
    threading.Thread(target=_warm_up_vectordb, name="vectordb-warm-up", daemon=True).start()

# Register modular routes
app.include_router(video.router)
app.include_router(notes.router)
app.include_router(quiz.router)
app.include_router(assignment.router)
app.include_router(flashcard.router)
app.include_router(tutor.router)

@app.get("/health")
def health_check():
    return {"status": "online", "service": "Vidyastra Modular ML Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)