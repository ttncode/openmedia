import json
from pathlib import Path

import pytest

from app.errors import ApiError
from app.settings_store import RuntimeSettings, SettingsStore

DEFAULTS = RuntimeSettings(retention_minutes=60, max_concurrent=3)


def test_missing_file_uses_defaults(tmp_path: Path) -> None:
    assert SettingsStore(tmp_path / "settings.json", DEFAULTS).current() == DEFAULTS


def test_update_persists_and_reloads(tmp_path: Path) -> None:
    path = tmp_path / "settings.json"
    SettingsStore(path, DEFAULTS).update(
        {"retention_minutes": 360, "max_concurrent": 5}
    )
    assert json.loads(path.read_text()) == {
        "retention_minutes": 360,
        "max_concurrent": 5,
    }
    assert SettingsStore(path, DEFAULTS).current() == RuntimeSettings(360, 5)


def test_partial_update_keeps_other_values(tmp_path: Path) -> None:
    store = SettingsStore(tmp_path / "settings.json", DEFAULTS)
    assert store.update({"max_concurrent": 1}) == RuntimeSettings(60, 1)


@pytest.mark.parametrize(
    "payload",
    [
        {"retention_minutes": 30},
        {"max_concurrent": 0},
        {"max_concurrent": 6},
        {"max_concurrent": True},
        {"retention_minutes": "60"},
    ],
)
def test_invalid_updates_are_rejected(
    tmp_path: Path, payload: dict[str, object]
) -> None:
    with pytest.raises(ApiError) as caught:
        SettingsStore(tmp_path / "settings.json", DEFAULTS).update(payload)
    assert caught.value.code == "invalid_option"


def test_corrupt_file_falls_back_to_defaults(tmp_path: Path) -> None:
    path = tmp_path / "settings.json"
    path.write_text("{not json")
    assert SettingsStore(path, DEFAULTS).current() == DEFAULTS
