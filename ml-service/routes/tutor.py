import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.tutor import tutor_answer
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

class TutorQuery(BaseModel):
    query: str

class TutorChat(BaseModel):
    message: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    lecture_id: Optional[str] = None

def _answer(message: str, subject: Optional[str], topic: Optional[str], lecture_id: Optional[str]) -> dict:
    try:
        return tutor_answer(message, subject=subject, topic=topic, lecture_id=lecture_id)
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for tutor (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("tutor request failed (lecture_id=%s)", lecture_id)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def tutor_chat(payload: TutorChat):
    return _answer(payload.message, payload.subject, payload.topic, payload.lecture_id)

@router.post("/{lecture_id}")
def ask_tutor(lecture_id: str, payload: TutorQuery):
    result = _answer(payload.query, None, None, lecture_id)
    return {"lecture_id": lecture_id, "query": payload.query, "response": result["reply"], "sources": result["sources"]}
