import logging
from fastapi import APIRouter, HTTPException
from services.assignment import generate_assignment_service
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assignment", tags=["Assignment"])

@router.get("/{lecture_id}")
def get_assignment(lecture_id: str):
    try:
        return {"lecture_id": lecture_id, "assignment": generate_assignment_service(lecture_id)}
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for assignment (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("assignment request failed (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=500, detail=str(e))