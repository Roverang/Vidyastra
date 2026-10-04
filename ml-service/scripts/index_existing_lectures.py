"""Index already-processed lectures (storage/fusion/*_fusion.json) into the ChromaDB "lecture_chunks" collection.

Usage (from ml-service/):  python scripts/index_existing_lectures.py
Safe to re-run: each lecture's chunks are replaced, never duplicated.
"""
import sys
from difflib import SequenceMatcher
from pathlib import Path

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402
from utils.helper import load_json  # noqa: E402
from services.vectordb import vectordb_service  # noqa: E402

MIN_CHARS = 300
UNTITLED = "Untitled lecture"

# Re-transcribing the same video gives slightly different Whisper output (measured 0.86-0.90 full-text
# similarity between copies of the DBMS lecture) while the opening stays identical. So a lecture is a
# duplicate if the full text is >90% similar, or the first OPENING_WORDS words are near-identical and
# the full text is still broadly similar (guards against lectures that merely share a channel intro).
DUPLICATE_THRESHOLD = 0.90
OPENING_WORDS = 200
OPENING_THRESHOLD = 0.95
OPENING_MIN_FULL_SIMILARITY = 0.75


def lecture_title(lecture_id: str) -> str:
    for video in sorted(settings.VIDEO_DIR.glob(f"{lecture_id}_*")):
        name = video.stem[len(lecture_id) + 1:].replace("_", " ").strip()
        if name:
            return name
    return UNTITLED


def similarity(a: list, b: list) -> float:
    # Word-level comparison is fast on ~2k-word transcripts and ignores whitespace noise.
    return SequenceMatcher(None, a, b, autojunk=False).ratio()


def duplicate_reason(text: str, other: str):
    a, b = text.split(), other.split()
    full = similarity(a, b)
    if full > DUPLICATE_THRESHOLD:
        return f"{full:.0%} similar"
    opening = similarity(a[:OPENING_WORDS], b[:OPENING_WORDS])
    if opening >= OPENING_THRESHOLD and full >= OPENING_MIN_FULL_SIMILARITY:
        return f"same opening ({opening:.0%} of first {OPENING_WORDS} words), {full:.0%} similar overall"
    return None


def _removed(count: int) -> str:
    return f"; removed {count} previously indexed chunks" if count else ""


def main() -> None:
    lectures = []
    for path in sorted(settings.FUSION_DIR.glob("*_fusion.json")):
        lecture_id = path.name[: -len("_fusion.json")]
        text = (load_json(path).get("complete_fused_text") or "").strip()
        lectures.append({"id": lecture_id, "title": lecture_title(lecture_id), "text": text})

    # Prefer titled lectures, then the longest text, so the richest copy of a duplicate is the one kept.
    lectures.sort(key=lambda l: (l["title"] == UNTITLED, -len(l["text"]), l["id"]))

    indexed = []
    for lec in lectures:
        if len(lec["text"]) < MIN_CHARS:
            removed = vectordb_service.delete_lecture(lec["id"])
            print(f"SKIP  {lec['id']} ({lec['title']}): only {len(lec['text'])} chars (< {MIN_CHARS}){_removed(removed)}")
            continue
        dup = next(((kept, reason) for kept in indexed if (reason := duplicate_reason(lec["text"], kept["text"]))), None)
        if dup:
            kept, reason = dup
            removed = vectordb_service.delete_lecture(lec["id"])
            print(f"SKIP  {lec['id']} ({lec['title']}): duplicate of {kept['id']} ({kept['title']}), {reason}{_removed(removed)}")
            continue
        count = vectordb_service.index_lecture(lec["text"], lec["id"], lec["title"])
        indexed.append(lec)
        print(f"INDEX {lec['id']} ({lec['title']}): {count} chunks")

    print(f"\nDone: {len(indexed)} lecture(s) indexed into collection 'lecture_chunks'.")


if __name__ == "__main__":
    main()
