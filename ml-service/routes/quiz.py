import logging
from typing import Annotated, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StringConstraints
from services.quiz import DEFAULT_QUESTIONS, MAX_QUESTIONS, Difficulty, generate_quiz_service, generate_topic_quiz
from services.retrieval import NoRelevantContentError
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quiz", tags=["Quiz"])


class QuizRequest(BaseModel):
    topic: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    subject: Optional[str] = None
    difficulty: Difficulty = "medium"
    num_questions: int = Field(default=DEFAULT_QUESTIONS, ge=1, le=MAX_QUESTIONS)
    lecture_id: Optional[str] = None


def _run(label: str, fn):
    try:
        return fn()
    except NoRelevantContentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for quiz (%s)", label)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("quiz request failed (%s)", label)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_quiz(payload: QuizRequest):
    return _run(f"topic={payload.topic!r}", lambda: generate_topic_quiz(
        payload.topic, payload.subject, payload.difficulty, payload.num_questions, payload.lecture_id))


@router.get("/{lecture_id}")
def get_quiz(lecture_id: str):
    return {"lecture_id": lecture_id, **_run(f"lecture_id={lecture_id}", lambda: generate_quiz_service(lecture_id))}
