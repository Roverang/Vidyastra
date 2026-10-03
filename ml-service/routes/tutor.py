import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.tutor import tutor_chat_service
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

class TutorQuery(BaseModel):
    query: str

@router.post("/{lecture_id}")
def ask_tutor(lecture_id: str, payload: TutorQuery):
    try:
        answer = tutor_chat_service(lecture_id, payload.query)
        return {"lecture_id": lecture_id, "query": payload.query, "response": answer}
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for tutor (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("tutor request failed (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=500, detail=str(e))