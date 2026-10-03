from services.vectordb import NO_CUTOFF, vectordb_service
from services.llm import llm_service

def generate_assignment_service(lecture_id: str) -> str:
    # Generic query inside a chosen lecture: keep every chunk instead of applying the relevance cut-off
    docs = vectordb_service.query(lecture_id, "practical problems exercises tasks assignment", top_k=5, max_distance=NO_CUTOFF)["documents"]
    return llm_service.generate("assignment.txt", "\n\n".join(docs))
