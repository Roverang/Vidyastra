from services.vectordb import NO_CUTOFF, vectordb_service
from services.llm import llm_service

def generate_flashcard_service(lecture_id: str) -> str:
    # Generic query inside a chosen lecture: keep every chunk instead of applying the relevance cut-off
    docs = vectordb_service.query(lecture_id, "key terms definitions concepts", top_k=6, max_distance=NO_CUTOFF)["documents"]
    return llm_service.generate("flashcard.txt", "\n\n".join(docs))
