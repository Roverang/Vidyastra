from services.vectordb import vectordb_service
from services.llm import llm_service

def generate_assignment_service(lecture_id: str) -> str:
    docs = vectordb_service.query(lecture_id, "practical problems exercises tasks assignment", top_k=5)["documents"]
    return llm_service.generate("assignment.txt", "\n\n".join(docs))