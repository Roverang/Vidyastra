from typing import Any, Dict, List, Literal, Optional, Type

from pydantic import BaseModel, Field, create_model

from services.llm import llm_service
from services.retrieval import retrieve_for_topic, retrieve_lecture

Difficulty = Literal["easy", "medium", "hard"]
MAX_QUESTIONS = 10
DEFAULT_QUESTIONS = 5
TOP_K = 6


class QuizQuestion(BaseModel):
    question: str = Field(min_length=1)
    options: List[str] = Field(min_length=4, max_length=4, description="Exactly 4 answer options")
    correct_index: int = Field(ge=0, le=3, description="0-based index of the correct option")
    explanation: str = Field(min_length=1, description="Why the correct option is right, based on the lecture")


def quiz_schema(num_questions: int) -> Type[BaseModel]:
    """A Quiz model that requires exactly `num_questions` questions."""
    return create_model(
        "Quiz",
        title=(str, Field(min_length=1)),
        questions=(List[QuizQuestion], Field(min_length=num_questions, max_length=num_questions)),
    )


def _generate(context: str, topic: str, subject: Optional[str], difficulty: str, num_questions: int) -> Dict[str, Any]:
    request = (
        f"Topic: {topic}\n"
        + (f"Subject: {subject}\n" if subject else "")
        + f"Difficulty: {difficulty}\nNumber of questions: {num_questions}"
    )
    quiz = llm_service.generate_json("quiz.txt", context, request, quiz_schema(num_questions))
    return quiz.model_dump()


def generate_topic_quiz(topic: str, subject: Optional[str] = None, difficulty: Difficulty = "medium",
                        num_questions: int = DEFAULT_QUESTIONS, lecture_id: Optional[str] = None) -> Dict[str, Any]:
    """Quiz grounded in the lecture chunks relevant to `topic`; raises NoRelevantContentError if none."""
    context, sources = retrieve_for_topic(topic, lecture_id, TOP_K)
    return {"quiz": _generate(context, topic, subject, difficulty, num_questions), "sources": sources}


def generate_quiz_service(lecture_id: str) -> Dict[str, Any]:
    """Legacy GET /quiz/{lecture_id}: a medium quiz over a whole lecture."""
    context, sources = retrieve_lecture(lecture_id, "important definitions questions exam topics", TOP_K)
    return {"quiz": _generate(context, "the main concepts of this lecture", None, "medium", DEFAULT_QUESTIONS),
            "sources": sources}
