import shutil
import subprocess
import logging
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

def _ffmpeg_executable() -> str:
    if settings.FFMPEG_PATH:
        if not Path(settings.FFMPEG_PATH).is_file():
            raise RuntimeError(f"FFMPEG_PATH is set to '{settings.FFMPEG_PATH}', but no file exists there.")
        return settings.FFMPEG_PATH
    found = shutil.which("ffmpeg")
    if not found:
        raise RuntimeError("ffmpeg not found: install it and add it to PATH, or set FFMPEG_PATH in ml-service/.env.")
    return found

def extract_audio_from_video(video_path: Path, output_audio_path: Path) -> Path:
    logger.info(f"Extracting audio from {video_path}")
    cmd = [
        _ffmpeg_executable(), "-y", "-i", str(video_path),
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        str(output_audio_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return output_audio_path
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg failed: {e.stderr}")
        raise RuntimeError(f"FFmpeg failed: {e.stderr}")
