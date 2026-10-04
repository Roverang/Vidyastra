"""Print retrieval distances for on-topic vs off-topic queries, to choose RELEVANCE_MAX_DISTANCE.

Usage (from ml-service/):  python scripts/measure_relevance.py
Read-only: it only queries the "lecture_chunks" collection.
"""
import sys
from pathlib import Path

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402
from services.vectordb import BGE_QUERY_INSTRUCTION, vectordb_service  # noqa: E402

ON_TOPIC = [
    "What are integrity constraints?",
    "primary key",
    "referential integrity",
    "integrity constraints",
]
OFF_TOPIC = [
    "Who won the FIFA World Cup?",
    "Who won the FIFA World Cup",
    "How do I bake a cake?",
    "binary search tree",
]


def distances(query: str, with_instruction: bool):
    text = BGE_QUERY_INSTRUCTION + query if with_instruction else query
    col = vectordb_service.collection
    res = col.query(
        query_embeddings=vectordb_service._embed([text]),
        n_results=min(4, col.count()),
        include=["distances"],
    )
    return res["distances"][0]


def main() -> None:
    threshold = settings.RELEVANCE_MAX_DISTANCE
    print(f"collection: {vectordb_service.collection.count()} chunks | metric: squared L2 on unit vectors "
          f"(= 2 - 2*cosine) | RELEVANCE_MAX_DISTANCE = {threshold}\n")
    # "raw" is what services/vectordb.py embeds; "instr" (BGE query prefix) is shown for comparison only
    header = f"{'kind':<9} {'query':<34} {'raw best':>9} {'raw top4':<27} {'instr best':>10} {'instr top4':<27} kept(raw)"
    print(header)
    print("-" * len(header))
    for kind, queries in (("ON", ON_TOPIC), ("OFF", OFF_TOPIC)):
        for q in queries:
            raw = distances(q, False)
            ins = distances(q, True)
            kept = sum(d <= threshold for d in raw)
            print(f"{kind:<9} {q:<34} {raw[0]:>9.3f} {' '.join(f'{d:.3f}' for d in raw):<27} "
                  f"{ins[0]:>10.3f} {' '.join(f'{d:.3f}' for d in ins):<27} {kept}/{len(raw)}")


if __name__ == "__main__":
    main()
