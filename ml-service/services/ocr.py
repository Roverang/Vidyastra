import logging
import threading
from pathlib import Path
from typing import List, Dict, Any
from config import settings
from utils.helper import save_json, require_package

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        self._engine = None
        self._lock = threading.Lock()
        self.conf = settings.OCR_CONFIDENCE_THRESHOLD

    @property
    def engine(self):
        if self._engine is None:
            with self._lock:
                if self._engine is None:
                    require_package("paddle", "paddlepaddle")
                    paddleocr = require_package("paddleocr", "paddleocr")
                    logger.info("Loading PaddleOCR engine...")
                    self._engine = paddleocr.PaddleOCR(use_angle_cls=False, lang='en')
        return self._engine

    def process_frames(self, frames: List[Dict[str, Any]], lecture_id: str) -> List[Dict[str, Any]]:
        engine = self.engine
        results = []
        for f in frames:
            path = f.get("file_path")
            if not path or not Path(path).exists(): continue
            try:
                res = engine.ocr(path, cls=False)
                texts = [{"text": line[1][0].strip(), "confidence": round(float(line[1][1]), 4)}
                         for line in res[0] if res and res[0] and line[1][1] >= self.conf and line[1][0].strip()]
                results.append({"timestamp": f.get("timestamp"), "frame_path": path, "extracted_texts": texts})
            except Exception as e:
                logger.error(f"OCR error on {path}: {e}")
        save_json({"lecture_id": lecture_id, "ocr_results": results}, settings.OCR_DIR / f"{lecture_id}_ocr.json")
        return results

ocr_service = OCRService()