import os
from dataclasses import dataclass
from pathlib import Path

TRUE_VALUES = frozenset({"1", "true", "yes", "on"})
PASSWORD_PLACEHOLDER = "changeme"


def _text(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def _flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    return default if not raw else raw in TRUE_VALUES


def _integer(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError as error:
        raise ValueError(f"{name} must be an integer, got {raw!r}") from error
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}, got {value}")
    return value


def _password() -> str:
    password = os.environ.get("OPENMEDIA_PASSWORD", "")
    if password == PASSWORD_PLACEHOLDER:
        raise ValueError(
            f"OPENMEDIA_PASSWORD is still the placeholder {PASSWORD_PLACEHOLDER}; "
            "set a password, or leave it empty only for a private local instance"
        )
    return password


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    password: str
    secret_key: str
    retention_minutes: int
    max_concurrent: int
    max_filesize_mb: int
    max_storage_gb: int
    max_playlist_items: int
    rate_limit_per_minute: int
    stall_timeout_seconds: float
    allow_private_urls: bool
    trusted_proxy_hops: int
    ytdlp_proxy: str

    @property
    def downloads_dir(self) -> Path:
        return self.data_dir / "downloads"

    @property
    def cookies_file(self) -> Path:
        return self.data_dir / "cookies.txt"

    @property
    def settings_file(self) -> Path:
        return self.data_dir / "settings.json"

    @property
    def secret_key_file(self) -> Path:
        return self.data_dir / "secret_key"

    @property
    def ytdlp_dir(self) -> Path:
        return self.data_dir / "yt-dlp"


def load_settings() -> Settings:
    return Settings(
        data_dir=Path(_text("OPENMEDIA_DATA_DIR", "/data")),
        password=_password(),
        secret_key=_text("OPENMEDIA_SECRET_KEY", ""),
        retention_minutes=_integer("OPENMEDIA_RETENTION_MINUTES", 60, 1, 10080),
        max_concurrent=_integer("OPENMEDIA_MAX_CONCURRENT", 3, 1, 5),
        max_filesize_mb=_integer("OPENMEDIA_MAX_FILESIZE_MB", 4096, 1, 1048576),
        max_storage_gb=_integer("OPENMEDIA_MAX_STORAGE_GB", 0, 0, 1048576),
        max_playlist_items=_integer("OPENMEDIA_MAX_PLAYLIST_ITEMS", 50, 1, 500),
        rate_limit_per_minute=_integer(
            "OPENMEDIA_RATE_LIMIT_PER_MINUTE", 120, 1, 10000
        ),
        stall_timeout_seconds=_integer(
            "OPENMEDIA_STALL_TIMEOUT_SECONDS", 180, 10, 3600
        ),
        allow_private_urls=_flag("OPENMEDIA_ALLOW_PRIVATE_URLS", False),
        trusted_proxy_hops=_integer("OPENMEDIA_TRUSTED_PROXY_HOPS", 1, 1, 5),
        ytdlp_proxy=_text("OPENMEDIA_YTDLP_PROXY", ""),
    )
