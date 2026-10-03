from services.vectordb import vectordb_service
from services.llm import llm_service

def tutor_chat_service(lecture_id: str, query: str) -> str:
    docs = vectordb_service.query(lecture_id, query, top_k=3)["documents"]
    return llm_service.generate("tutor.txt", "\n\n".join(docs), user_query=query)