import logging
from fastapi import APIRouter, HTTPException
from services.quiz import generate_quiz_service
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quiz", tags=["Quiz"])

@router.get("/{lecture_id}")
def get_quiz(lecture_id: str):
    try:
        return {"lecture_id": lecture_id, "quiz": generate_quiz_service(lecture_id)}
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for quiz (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("quiz request failed (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=500, detail=str(e))