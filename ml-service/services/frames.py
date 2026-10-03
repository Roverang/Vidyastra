import logging
from pathlib import Path
from typing import List, Dict, Any
from config import settings
from utils.helper import save_json, require_package

logger = logging.getLogger(__name__)

class FrameService:
    def __init__(self):
        self.threshold = settings.SCENE_SIMILARITY_THRESHOLD

    def _similarity(self, cv2, f1, f2) -> float:
        hsv1, hsv2 = cv2.cvtColor(f1, cv2.COLOR_BGR2HSV), cv2.cvtColor(f2, cv2.COLOR_BGR2HSV)
        hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
        return float(cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL))

    def extract_keyframes(self, video_path: Path, lecture_id: str) -> List[Dict[str, Any]]:
        cv2 = require_package("cv2", "opencv-python")
        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        out_dir = settings.FRAME_DIR / lecture_id
        out_dir.mkdir(parents=True, exist_ok=True)

        frames, idx, saved, last_frame = [], 0, 0, None
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            if idx % int(fps) == 0 or idx == 0:
                t = round(idx / fps, 2)
                is_new = last_frame is None or self._similarity(cv2, last_frame, frame) < self.threshold
                if is_new:
                    last_frame = frame.copy()
                    path = out_dir / f"frame_{saved:04d}_t_{t}s.jpg"
                    cv2.imwrite(str(path), frame)
                    frames.append({"frame_index": idx, "timestamp": t, "file_path": str(path)})
                    saved += 1
            idx += 1
        cap.release()
        save_json({"lecture_id": lecture_id, "frames": frames}, settings.FRAME_DIR / f"{lecture_id}_frames.json")
        return frames

frame_service = FrameService()