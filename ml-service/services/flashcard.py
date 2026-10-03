from services.vectordb import vectordb_service
from services.llm import llm_service

def generate_flashcard_service(lecture_id: str) -> str:
    docs = vectordb_service.query(lecture_id, "key terms definitions concepts", top_k=6)["documents"]
    return llm_service.generate("flashcard.txt", "\n\n".join(docs))