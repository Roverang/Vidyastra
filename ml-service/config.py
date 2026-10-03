import os
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LLM_PROVIDER: Literal["gemini", "ollama"] = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.5-flash-lite"
    LOCAL_LLM_FALLBACK: bool = True
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    LLM_TIMEOUT_SECONDS: int = 120

    WHISPER_MODEL_SIZE: str = "base"
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"

    SCENE_SIMILARITY_THRESHOLD: float = 0.85
    OCR_CONFIDENCE_THRESHOLD: float = 0.60
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    # Retrieved chunks farther than this (squared L2 on unit vectors = 2 - 2*cosine) are treated as
    # unrelated. Chosen from scripts/measure_relevance.py: on-topic best matches 0.52-0.58,
    # off-topic best matches >= 0.79 (6 chunks / 1 lecture; re-measure as more lectures are indexed).
    RELEVANCE_MAX_DISTANCE: float = 0.70

    BASE_DIR: Path = Path(__file__).resolve().parent
    STORAGE_DIR: Path = BASE_DIR / "storage"

    VIDEO_DIR: Path = STORAGE_DIR / "videos"
    AUDIO_DIR: Path = STORAGE_DIR / "audio"
    FRAME_DIR: Path = STORAGE_DIR / "frames"
    TRANSCRIPT_DIR: Path = STORAGE_DIR / "transcript"
    OCR_DIR: Path = STORAGE_DIR / "ocr"
    FUSION_DIR: Path = STORAGE_DIR / "fusion"
    CHROMA_DIR: Path = BASE_DIR / "vectordb" / "chroma"
    PROMPTS_DIR: Path = BASE_DIR / "prompts"

    def ensure_directories(self):
        for d in [
            self.VIDEO_DIR, self.AUDIO_DIR, self.FRAME_DIR,
            self.TRANSCRIPT_DIR, self.OCR_DIR, self.FUSION_DIR,
            self.CHROMA_DIR, self.PROMPTS_DIR
        ]:
            d.mkdir(parents=True, exist_ok=True)

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
