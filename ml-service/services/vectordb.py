import threading
from typing import Any, Dict, List, Optional
from config import settings
from utils.chunk import chunk_text

COLLECTION_NAME = "lecture_chunks"


class VectorDBService:
    def __init__(self):
        self._embedding_model = None
        self._client = None
        self._collection = None
        self._lock = threading.Lock()

    @property
    def embedding_model(self):
        if self._embedding_model is None:
            with self._lock:
                if self._embedding_model is None:
                    from sentence_transformers import SentenceTransformer
                    self._embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return self._embedding_model

    @property
    def collection(self):
        if self._collection is None:
            with self._lock:
                if self._collection is None:
                    import chromadb
                    self._client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
                    self._collection = self._client.get_or_create_collection(name=COLLECTION_NAME)
        return self._collection

    def _embed(self, texts: List[str]) -> List[List[float]]:
        return self.embedding_model.encode(texts, show_progress_bar=False).tolist()

    def index_lecture(self, text: str, lecture_id: str, lecture_title: str = "Untitled lecture") -> int:
        chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        if not chunks: return 0
        # Drop any previous chunks for this lecture so re-indexing never leaves stale ones behind.
        self.delete_lecture(lecture_id)
        self.collection.upsert(
            documents=[c["text"] for c in chunks],
            embeddings=self._embed([c["text"] for c in chunks]),
            metadatas=[{"lecture_id": lecture_id, "lecture_title": lecture_title, "chunk_index": c["chunk_index"]} for c in chunks],
            ids=[f"{lecture_id}_chunk_{c['chunk_index']}" for c in chunks]
        )
        return len(chunks)

    def delete_lecture(self, lecture_id: str) -> int:
        """Removes all chunks of a lecture; returns how many were removed."""
        col = self.collection
        existing = col.get(where={"lecture_id": lecture_id}, include=[])["ids"]
        if existing:
            col.delete(ids=existing)
        return len(existing)

    def query(self, lecture_id: Optional[str], query: str, top_k: int = 3) -> Dict[str, List[Any]]:
        """Returns {"documents": [...], "metadatas": [...]}; searches all lectures when lecture_id is None."""
        res = self.collection.query(
            query_embeddings=self._embed([query]),
            n_results=top_k,
            where={"lecture_id": lecture_id} if lecture_id else None,
        )
        return {
            "documents": (res.get("documents") or [[]])[0],
            "metadatas": (res.get("metadatas") or [[]])[0],
        }


vectordb_service = VectorDBService()
