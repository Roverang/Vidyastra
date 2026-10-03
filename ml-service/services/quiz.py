from services.vectordb import vectordb_service
from services.llm import llm_service

def generate_quiz_service(lecture_id: str) -> str:
    docs = vectordb_service.query(lecture_id, "important definitions questions exam topics", top_k=5)["documents"]
    return llm_service.generate("quiz.txt", "\n\n".join(docs))