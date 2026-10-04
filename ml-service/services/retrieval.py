from typing import Any, Dict, List, Optional, Tuple
from services.vectordb import NO_CUTOFF, vectordb_service

EXCERPT_CHARS = 200


class NoRelevantContentError(Exception):
    """No indexed lecture chunk is close enough to the request to ground an answer."""


def to_sources(result: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
    """Converts a vectordb query result into the `sources` list returned to clients."""
    return [
        {
            "lecture_id": (meta or {}).get("lecture_id"),
            "lecture_title": (meta or {}).get("lecture_title", "Untitled lecture"),
            "chunk_index": (meta or {}).get("chunk_index"),
            "distance": round(float(dist), 3),
            "excerpt": doc[:EXCERPT_CHARS],
        }
        for doc, meta, dist in zip(result["documents"], result["metadatas"], result["distances"])
    ]


def retrieve_for_topic(topic: str, lecture_id: Optional[str], top_k: int) -> Tuple[str, List[Dict[str, Any]]]:
    """Returns (context, sources) for the chunks relevant to `topic`.

    Only the topic itself is embedded: adding a subject name pulls unrelated queries towards
    lectures of that subject and defeats the relevance cut-off (see scripts/measure_relevance.py).
    Raises NoRelevantContentError when nothing passes the cut-off.
    """
    result = vectordb_service.query(lecture_id, topic, top_k=top_k)
    if not result["documents"]:
        raise NoRelevantContentError(f"No indexed lecture covers '{topic}' yet.")
    return "\n\n".join(result["documents"]), to_sources(result)


def retrieve_lecture(lecture_id: str, query: str, top_k: int) -> Tuple[str, List[Dict[str, Any]]]:
    """Context for an explicitly chosen lecture (legacy GET endpoints): no relevance cut-off."""
    result = vectordb_service.query(lecture_id, query, top_k=top_k, max_distance=NO_CUTOFF)
    if not result["documents"]:
        raise NoRelevantContentError(f"Lecture '{lecture_id}' has no indexed content.")
    return "\n\n".join(result["documents"]), to_sources(result)
