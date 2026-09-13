from pathlib import Path

import pytest

from app.config import load_settings


def test_defaults_point_at_data_volume(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "OPENMEDIA_DATA_DIR",
        "OPENMEDIA_MAX_CONCURRENT",
        "OPENMEDIA_ALLOW_PRIVATE_URLS",
    ):
        monkeypatch.delenv(name, raising=False)
    settings = load_settings()
    assert settings.data_dir == Path("/data")
    assert settings.max_concurrent == 3
    assert settings.allow_private_urls is False
    assert settings.downloads_dir == Path("/data/downloads")


def test_environment_overrides(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("OPENMEDIA_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("OPENMEDIA_MAX_CONCURRENT", "5")
    monkeypatch.setenv("OPENMEDIA_ALLOW_PRIVATE_URLS", "true")
    settings = load_settings()
    assert settings.data_dir == tmp_path
    assert settings.max_concurrent == 5
    assert settings.allow_private_urls is True


def test_out_of_range_value_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENMEDIA_MAX_CONCURRENT", "9")
    with pytest.raises(ValueError, match="OPENMEDIA_MAX_CONCURRENT"):
        load_settings()
