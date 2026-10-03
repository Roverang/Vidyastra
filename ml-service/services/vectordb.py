import threading
from typing import Any, Dict, List, Optional
from config import settings
from utils.chunk import chunk_text

COLLECTION_NAME = "lecture_chunks"

# BGE v1.5 models are trained with this prefix on short retrieval queries (not on the passages).
BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

# Pass as max_distance to keep every result (e.g. when a lecture is already chosen explicitly).
NO_CUTOFF = None
_DEFAULT = object()


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
        # The model ends in a Normalize layer, so vectors are unit length and Chroma's squared L2
        # distance is 2 - 2 * cosine similarity (0 = identical, 2 = opposite).
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

    def query(self, lecture_id: Optional[str], query: str, top_k: int = 3,
              max_distance: Any = _DEFAULT) -> Dict[str, List[Any]]:
        """Returns {"documents", "metadatas", "distances"} for the closest chunks, nearest first.

        Searches all lectures when lecture_id is None. Chunks farther than max_distance
        (default settings.RELEVANCE_MAX_DISTANCE) are dropped, so an off-topic query returns
        empty lists; pass NO_CUTOFF to keep everything.
        """
        if max_distance is _DEFAULT:
            max_distance = settings.RELEVANCE_MAX_DISTANCE
        res = self.collection.query(
            query_embeddings=self._embed([query]),
            n_results=top_k,
            where={"lecture_id": lecture_id} if lecture_id else None,
            include=["documents", "metadatas", "distances"],
        )
        rows = zip(
            (res.get("documents") or [[]])[0],
            (res.get("metadatas") or [[]])[0],
            (res.get("distances") or [[]])[0],
        )
        kept = [r for r in rows if max_distance is None or r[2] <= max_distance]
        return {
            "documents": [r[0] for r in kept],
            "metadatas": [r[1] for r in kept],
            "distances": [r[2] for r in kept],
        }


vectordb_service = VectorDBService()
