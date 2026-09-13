from pathlib import Path

import pytest
from flask import Flask

from app.health import health, missing_dependencies


def make_app(data_dir: Path) -> Flask:
    app = Flask(__name__)
    app.config["OPENMEDIA_DATA_DIR"] = str(data_dir)
    app.register_blueprint(health)
    return app


def test_live_reports_ok(tmp_path: Path) -> None:
    response = make_app(tmp_path).test_client().get("/health/live")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_ready_names_missing_dependencies(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.health.shutil.which", lambda name: None)
    assert missing_dependencies(tmp_path) == ["ffmpeg"]
    response = make_app(tmp_path).test_client().get("/health/ready")
    assert response.status_code == 503
    assert "ffmpeg" in response.get_json()["reason"]


def test_ready_passes_when_everything_is_present(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.health.shutil.which", lambda name: "/usr/bin/ffmpeg")
    assert make_app(tmp_path).test_client().get("/health/ready").status_code == 200
