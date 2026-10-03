from services.vectordb import vectordb_service
from services.llm import llm_service

def generate_notes_service(lecture_id: str) -> str:
    # Fetch all or top chunks for a comprehensive summary notes generation
    docs = vectordb_service.query(lecture_id, "summary core concepts lecture overview", top_k=10)["documents"]
    context = "\n\n".join(docs)
    return llm_service.generate("notes.txt", context)