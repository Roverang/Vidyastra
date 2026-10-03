import json
import uuid
from pathlib import Path
from typing import Any, Dict

def generate_lecture_id() -> str:
    return uuid.uuid4().hex

def save_json(data: Dict[str, Any], file_path: Path) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def load_json(file_path: Path) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

class MissingDependencyError(RuntimeError):
    """Raised when an optional heavy package (Whisper, PaddleOCR, OpenCV) is not installed."""


def require_package(module_name: str, pip_name: str):
    import importlib
    try:
        return importlib.import_module(module_name)
    except ImportError as e:
        raise MissingDependencyError(
            f"Required package '{pip_name}' is not installed (import of '{module_name}' failed: {e}). "
            f"Install it with: pip install {pip_name}"
        ) from e


def load_prompt(prompt_filename: str) -> str:
    from config import settings
    prompt_path = settings.PROMPTS_DIR / prompt_filename
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read().strip()