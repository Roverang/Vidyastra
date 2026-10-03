from typing import Any, Dict, List, Optional
from services.vectordb import vectordb_service
from services.llm import llm_service

TOP_K = 4
EXCERPT_CHARS = 200
NO_CONTEXT = "(No lecture context was found for this question. Tell the student the indexed lectures do not cover it.)"


def _is_specified(value: Optional[str]) -> bool:
    return bool(value and value.strip() and value.strip().lower() != "general")


def tutor_answer(message: str, subject: Optional[str] = None, topic: Optional[str] = None,
                 lecture_id: Optional[str] = None) -> Dict[str, Any]:
    search_query = " ".join([message] + [v.strip() for v in (topic, subject) if _is_specified(v)])
    res = vectordb_service.query(lecture_id, search_query, top_k=TOP_K)
    docs, metas = res["documents"], res["metadatas"]

    context = "\n\n".join(docs) if docs else NO_CONTEXT
    reply = llm_service.generate("tutor.txt", context, user_query=message)

    sources: List[Dict[str, Any]] = [
        {
            "lecture_id": (meta or {}).get("lecture_id"),
            "lecture_title": (meta or {}).get("lecture_title", "Untitled lecture"),
            "chunk_index": (meta or {}).get("chunk_index"),
            "excerpt": doc[:EXCERPT_CHARS],
        }
        for doc, meta in zip(docs, metas)
    ]
    return {"reply": reply, "sources": sources}


def tutor_chat_service(lecture_id: str, query: str) -> str:
    return tutor_answer(query, lecture_id=lecture_id)["reply"]
