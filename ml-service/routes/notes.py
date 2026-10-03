import logging
from typing import Annotated, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, StringConstraints
from services.notes import generate_notes_service, generate_topic_notes
from services.retrieval import NoRelevantContentError
from services.llm import LLMGenerationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["Notes"])


class NotesRequest(BaseModel):
    topic: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    subject: Optional[str] = None
    lecture_id: Optional[str] = None


def _run(label: str, fn):
    try:
        return fn()
    except NoRelevantContentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except LLMGenerationError as e:
        logger.exception("LLM generation failed for notes (%s)", label)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("notes request failed (%s)", label)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_notes(payload: NotesRequest):
    return _run(f"topic={payload.topic!r}", lambda: generate_topic_notes(
        payload.topic, payload.subject, payload.lecture_id))


@router.get("/{lecture_id}")
def get_notes(lecture_id: str):
    return {"lecture_id": lecture_id, **_run(f"lecture_id={lecture_id}", lambda: generate_notes_service(lecture_id))}
