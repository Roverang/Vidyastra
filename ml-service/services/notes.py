from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from services.llm import llm_service
from services.retrieval import retrieve_for_topic, retrieve_lecture

TOP_K = 8


class NotesSection(BaseModel):
    heading: str = Field(min_length=1)
    points: List[str] = Field(min_length=1, description="Key points as short bullet sentences")


class Notes(BaseModel):
    title: str = Field(min_length=1)
    overview: str = Field(min_length=1, description="One or two sentences introducing the topic")
    sections: List[NotesSection] = Field(min_length=1, max_length=6)
    example: str = Field(min_length=1, description="A short worked example taken from or based on the lecture")
    summary: List[str] = Field(min_length=3, max_length=3, description="Exactly 3 one-line summary sentences")


def to_markdown(notes: Notes) -> str:
    """Renders structured notes as Markdown, so every response has the same layout."""
    lines = [f"# {notes.title}", "", notes.overview, ""]
    for section in notes.sections:
        lines += [f"## {section.heading}", ""] + [f"- {p}" for p in section.points] + [""]
    lines += ["## Example", "", notes.example, "", "## Summary", ""] + [f"{i}. {s}" for i, s in enumerate(notes.summary, 1)]
    return "\n".join(lines).strip() + "\n"


def _generate(context: str, topic: str, subject: Optional[str]) -> str:
    request = f"Topic: {topic}" + (f"\nSubject: {subject}" if subject else "")
    return to_markdown(llm_service.generate_json("notes.txt", context, request, Notes))


def generate_topic_notes(topic: str, subject: Optional[str] = None, lecture_id: Optional[str] = None) -> Dict[str, Any]:
    """Notes grounded in the lecture chunks relevant to `topic`; raises NoRelevantContentError if none."""
    context, sources = retrieve_for_topic(topic, lecture_id, TOP_K)
    return {"notes": _generate(context, topic, subject), "sources": sources}


def generate_notes_service(lecture_id: str) -> Dict[str, Any]:
    """Legacy GET /notes/{lecture_id}: notes for a whole lecture."""
    context, sources = retrieve_lecture(lecture_id, "summary core concepts lecture overview", TOP_K)
    return {"notes": _generate(context, "the main concepts of this lecture", None), "sources": sources}
