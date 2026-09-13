import json
import threading
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from pathlib import Path

from .errors import ApiError

RETENTION_CHOICES = (15, 60, 360, 1440)
MIN_CONCURRENT = 1
MAX_CONCURRENT = 5


@dataclass(frozen=True)
class RuntimeSettings:
    retention_minutes: int
    max_concurrent: int

    def to_json(self) -> dict[str, int]:
        return asdict(self)


def _integer_or_none(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def parse_runtime_settings(
    payload: Mapping[str, object], fallback: RuntimeSettings
) -> RuntimeSettings:
    retention = _integer_or_none(
        payload.get("retention_minutes", fallback.retention_minutes)
    )
    concurrency = _integer_or_none(
        payload.get("max_concurrent", fallback.max_concurrent)
    )
    if retention is None or (
        retention != fallback.retention_minutes and retention not in RETENTION_CHOICES
    ):
        raise ApiError(
            400, "invalid_option", "retention_minutes must be 15, 60, 360 or 1440."
        )
    if concurrency is None or not MIN_CONCURRENT <= concurrency <= MAX_CONCURRENT:
        raise ApiError(400, "invalid_option", "max_concurrent must be between 1 and 5.")
    return RuntimeSettings(retention_minutes=retention, max_concurrent=concurrency)


class SettingsStore:
    def __init__(self, path: Path, defaults: RuntimeSettings) -> None:
        self._path = path
        self._lock = threading.Lock()
        self._current = self._load(defaults)

    def _load(self, defaults: RuntimeSettings) -> RuntimeSettings:
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
            return (
                parse_runtime_settings(raw, defaults)
                if isinstance(raw, dict)
                else defaults
            )
        except (OSError, json.JSONDecodeError, ApiError):
            return defaults

    def current(self) -> RuntimeSettings:
        with self._lock:
            return self._current

    def update(self, payload: Mapping[str, object]) -> RuntimeSettings:
        updated = parse_runtime_settings(payload, self.current())
        self._path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self._path.with_suffix(".tmp")
        temporary.write_text(json.dumps(updated.to_json()), encoding="utf-8")
        temporary.replace(self._path)
        with self._lock:
            self._current = updated
        return updated
