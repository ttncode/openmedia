import importlib.util
import os
import shutil
from pathlib import Path

from flask import Blueprint, Response, current_app, jsonify

health = Blueprint("health", __name__)

Reply = Response | tuple[Response, int]


def missing_dependencies(data_dir: Path) -> list[str]:
    checks = {
        "yt-dlp": importlib.util.find_spec("yt_dlp") is not None,
        "ffmpeg": shutil.which("ffmpeg") is not None,
        "data directory": data_dir.is_dir() and os.access(data_dir, os.W_OK),
    }
    return [name for name, passed in checks.items() if not passed]


@health.get("/health/live")
def live() -> Reply:
    return jsonify(status="ok")


@health.get("/health/ready")
def ready() -> Reply:
    data_dir = Path(current_app.config["OPENMEDIA_DATA_DIR"])
    missing = missing_dependencies(data_dir)
    if missing:
        return jsonify(
            status="unavailable", reason=f"missing: {', '.join(missing)}"
        ), 503
    return jsonify(status="ok")
