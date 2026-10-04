import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from config import settings
from utils.ffmpeg import extract_audio_from_video
from utils.helper import generate_lecture_id, MissingDependencyError, require_package
from services.audio import audio_service
from services.frames import frame_service
from services.ocr import ocr_service
from services.fusion import fusion_service
from services.vectordb import vectordb_service

logger = logging.getLogger(__name__)

VIDEO_DEPENDENCIES = [
    ("faster_whisper", "faster-whisper"),
    ("cv2", "opencv-python"),
    ("paddle", "paddlepaddle"),
    ("paddleocr", "paddleocr"),
]

router = APIRouter(prefix="/video", tags=["Video Processing"])

@router.post("/process")
async def process_video(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".mp4", ".avi", ".mov", ".mkv", ".webm")):
        raise HTTPException(status_code=400, detail="Invalid video format.")

    # Fail fast before saving the upload if the heavy optional packages are missing.
    try:
        for module_name, pip_name in VIDEO_DEPENDENCIES:
            require_package(module_name, pip_name)
    except MissingDependencyError as e:
        logger.error("Video processing unavailable: %s", e)
        raise HTTPException(status_code=503, detail=str(e))

    lid = generate_lecture_id()
    v_path = settings.VIDEO_DIR / f"{lid}_{file.filename}"
    a_path = settings.AUDIO_DIR / f"{lid}.wav"

    try:
        with open(v_path, "wb") as f:
            f.write(await file.read())
        
        extract_audio_from_video(v_path, a_path)
        transcript = audio_service.transcribe(a_path, lid)
        frames = frame_service.extract_keyframes(v_path, lid)
        ocr = ocr_service.process_frames(frames, lid)
        fusion = fusion_service.fuse(transcript, ocr, lid)
        title = Path(file.filename).stem.replace("_", " ").strip() or "Untitled lecture"
        chunks_count = vectordb_service.index_lecture(fusion["complete_fused_text"], lid, title)

        return {"status": "success", "lecture_id": lid, "indexed_chunks": chunks_count}
    except MissingDependencyError as e:
        logger.error("Video processing unavailable: %s", e)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Video processing failed (lecture_id=%s)", lid)
        raise HTTPException(status_code=500, detail=str(e))