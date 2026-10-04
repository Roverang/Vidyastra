import logging
from fastapi import APIRouter, HTTPException
from services.flashcard import generate_flashcard_service
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/flashcard", tags=["Flashcards"])

@router.get("/{lecture_id}")
def get_flashcards(lecture_id: str):
    try:
        return {"lecture_id": lecture_id, "flashcards": generate_flashcard_service(lecture_id)}
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for flashcard (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("flashcard request failed (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=500, detail=str(e))