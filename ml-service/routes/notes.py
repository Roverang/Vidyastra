import logging
from fastapi import APIRouter, HTTPException
from services.notes import generate_notes_service
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.get("/{lecture_id}")
def get_notes(lecture_id: str):
    try:
        return {"lecture_id": lecture_id, "notes": generate_notes_service(lecture_id)}
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for notes (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("notes request failed (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=500, detail=str(e))