import logging
import threading
from pathlib import Path
from typing import Dict, Any
from config import settings
from utils.helper import save_json, require_package

logger = logging.getLogger(__name__)

class AudioService:
    def __init__(self):
        self._model = None
        self._lock = threading.Lock()

    @property
    def model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    faster_whisper = require_package("faster_whisper", "faster-whisper")
                    logger.info(f"Loading Whisper model ({settings.WHISPER_MODEL_SIZE})...")
                    self._model = faster_whisper.WhisperModel(settings.WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
        return self._model

    def transcribe(self, audio_path: Path, lecture_id: str) -> Dict[str, Any]:
        segments_gen, info = self.model.transcribe(str(audio_path), beam_size=5)
        segments, full_text = [], []
        for seg in segments_gen:
            segments.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()})
            full_text.append(seg.text.strip())
        
        complete_text = " ".join(full_text)
        data = {
            "lecture_id": lecture_id, "language": info.language,
            "duration": round(info.duration, 2), "complete_text": complete_text, "segments": segments
        }
        
        with open(settings.TRANSCRIPT_DIR / f"{lecture_id}.txt", "w", encoding="utf-8") as f:
            f.write(complete_text)
        save_json(data, settings.TRANSCRIPT_DIR / f"{lecture_id}.json")
        return data

audio_service = AudioService()