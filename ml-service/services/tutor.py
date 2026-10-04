from typing import Any, Dict, List, Optional
from services.vectordb import vectordb_service
from services.llm import llm_service
from services.retrieval import to_sources

TOP_K = 4
NO_CONTEXT = "(No lecture context was found for this question. Tell the student the indexed lectures do not cover it.)"


def _is_specified(value: Optional[str]) -> bool:
    return bool(value and value.strip() and value.strip().lower() != "general")


def tutor_answer(message: str, subject: Optional[str] = None, topic: Optional[str] = None,
                 lecture_id: Optional[str] = None) -> Dict[str, Any]:
    # Search with the student's message only: appending the UI's subject/topic pulls off-topic
    # questions under the relevance cut-off (measured in scripts/measure_relevance.py).
    res = vectordb_service.query(lecture_id, message, top_k=TOP_K)
    docs = res["documents"]

    focus = " / ".join(v.strip() for v in (subject, topic) if _is_specified(v))
    user_query = f"{message}\n(Student's selected focus: {focus})" if focus else message

    context = "\n\n".join(docs) if docs else NO_CONTEXT
    reply = llm_service.generate("tutor.txt", context, user_query=user_query)

    sources: List[Dict[str, Any]] = to_sources(res)  # [] when nothing passed the cut-off
    return {"reply": reply, "sources": sources}


def tutor_chat_service(lecture_id: str, query: str) -> str:
    return tutor_answer(query, lecture_id=lecture_id)["reply"]
