# OpenMedia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the scaffold-generated project into a shippable OpenMedia release: a secured, extended Flask + yt-dlp API and an Apple-style Next.js web app, documented and released.

**Architecture:** `apps/api` keeps reclip's Flask foundation and endpoint shapes and adds a job engine (queue, progress, cancel, retention), security (network guard, cross-site guard, rate limit, optional password) and cookie handling. `apps/web` serves the UI and proxies every `/api/*` request to the API at runtime. Compose runs both images with a data volume.

**Tech Stack:** Python 3.13, Flask 3, gunicorn, yt-dlp 2026.8.19 (`default`, `deno`, `curl-cffi` extras), ffmpeg, uv, pytest, ruff, mypy strict; Next.js 16.3.5, React 19.2.8, TypeScript strict, CSS Modules, `@phosphor-icons/react`, vitest, Testing Library; VitePress; Docker.

**Spec:** `docs/superpowers/specs/2026-09-14-openmedia-design.md`

## Global Constraints

- Zero code comments in Python, TypeScript, CSS, shell and YAML you write ("clean code needs no comments"); intent lives in names. Generated files keep their existing comments.
- Python: type hints everywhere, `mypy --strict app tests` clean, `ruff check` and `ruff format --check` clean, functions at most about 20 lines, no bare `except`.
- TypeScript: no `any`, explicit return types on exported functions, `const` by default, `===` only, no `console.log`.
- Every commit uses Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `build:`, `ci:`, `chore:`), enforced by commitlint.
- API JSON is snake_case; every error is `{"error": "<message>", "code": "<code>"}`.
- reclip compatibility: `POST /api/info`, `POST /api/playlist`, `POST /api/download {url, format, format_id, title}`, `GET /api/status/{id}` (`status`, `error`, `filename`), `GET /api/file/{id}` keep working.
- UI copy: Vietnamese and English dictionaries, no em dash or en dash characters in visible text, no emoji.
- Accent default teal: fill `#12939c`, light text `#0b7178`, dark fill `#3fbac2`, dark text `#5cc9d0`.
- Brand: logo frame path `M9 22 V9 H22 M42 9 H55 V22 M55 42 V55 H42 M22 55 H9 V42`, wave path `M23 27 V37 M32 20 V44 M41 25 V39`, viewBox `0 0 64 64`, stroke 6, round caps and joins.
- Per-root verification is `mise run //apps/api:ci-unit`, `mise run //apps/web:ci-unit`, `mise run //docs:ci-unit`, all run from the project root.
- Reference material outside the repository (read-only):
  - Approved prototype: `/tmp/claude-1000/-home-ttndev-workspace-playground-openmedia/f044fd99-123a-4570-90dc-70fb559509d9/scratchpad/designs/apple/` (tokens.css, base.css, layout.css, components.css, overlays.css, body.html, data.js, format.js, render.js, inspector.js, overlays.js, actions.js, app.js)
  - Logo assets: `/tmp/claude-1000/-home-ttndev-workspace-playground-openmedia/f044fd99-123a-4570-90dc-70fb559509d9/scratchpad/logo/assets/`
  - reclip source: `/tmp/claude-1000/-home-ttndev-workspace-playground-openmedia/f044fd99-123a-4570-90dc-70fb559509d9/scratchpad/reclip/`

## File Map

### API (`apps/api`)

| File                                                                            | Task | Responsibility                                                |
| ------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| `apps/api/pyproject.toml`                                                       | 1    | Adds `yt-dlp[default,deno,curl-cffi]==2026.8.19`              |
| `apps/api/app/config.py`                                                        | 1    | `Settings`, `load_settings()`                                 |
| `apps/api/app/errors.py`                                                        | 1    | `ApiError`, `register_error_handlers()`                       |
| `apps/api/app/health.py`                                                        | 1    | Liveness and readiness (yt-dlp, ffmpeg, data dir)             |
| `apps/api/app/validation.py`                                                    | 2    | URL and download option validation                            |
| `apps/api/app/network_guard.py`                                                 | 2    | Public address enforcement                                    |
| `apps/api/app/progress.py`                                                      | 3    | Progress line parsing and tracking                            |
| `apps/api/app/ytdlp.py`                                                         | 3    | Command builders, error mapping, info and playlist extraction |
| `apps/api/app/settings_store.py`                                                | 4    | Runtime settings persisted to JSON                            |
| `apps/api/app/storage.py`                                                       | 4    | Disk usage and storage limit                                  |
| `apps/api/app/jobs.py`                                                          | 4    | `JobManager` and job model                                    |
| `apps/api/app/cleanup.py`                                                       | 4    | Retention sweeper and orphan removal                          |
| `apps/api/app/cookies.py`                                                       | 5    | Cookie file validation and summary                            |
| `apps/api/app/security.py`                                                      | 5    | Secret key, password session, cross-site guard, rate limiter  |
| `apps/api/app/services.py`                                                      | 6    | `Services` container and `build_services()`                   |
| `apps/api/app/media.py`                                                         | 6    | All `/api/*` routes                                           |
| `apps/api/app/__init__.py`                                                      | 6    | `create_app()`                                                |
| `apps/api/tests/*`                                                              | 1-6  | pytest suites named after modules                             |
| `apps/api/Dockerfile`, `apps/api/docker-entrypoint.sh`, `apps/api/.env.example` | 7    | Container image and runtime                                   |
| `compose.yaml`, `compose.dev.yaml`, `example.env`, `renovate.json`              | 7    | Stack wiring, yt-dlp update policy                            |

### Web (`apps/web`)

| File                                                                                                                                         | Task | Responsibility                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------- |
| `apps/web/package.json`                                                                                                                      | 8    | Dependencies and test tooling                                                                           |
| `apps/web/vitest.config.ts`, `apps/web/src/test/setup.ts`                                                                                    | 8    | Test environment                                                                                        |
| `apps/web/src/app/globals.css`                                                                                                               | 8    | Tokens and base styles ported from the prototype                                                        |
| `apps/web/src/app/layout.tsx`                                                                                                                | 8    | Fonts, metadata, theme bootstrap, providers                                                             |
| `apps/web/src/app/api/[...path]/route.ts`                                                                                                    | 8    | Runtime API proxy                                                                                       |
| `apps/web/src/lib/api/types.ts`, `apps/web/src/lib/api/client.ts`                                                                            | 8    | API types and client                                                                                    |
| `apps/web/src/lib/links.ts`, `apps/web/src/lib/format.ts`                                                                                    | 8    | Link parsing, formatting                                                                                |
| `apps/web/src/lib/i18n/`                                                                                                                     | 8    | Dictionaries and provider                                                                               |
| `apps/web/src/lib/preferences.ts`                                                                                                            | 9    | localStorage persistence                                                                                |
| `apps/web/src/state/`                                                                                                                        | 9    | Reducer, context, polling, commands                                                                     |
| `apps/web/src/components/controls/`                                                                                                          | 10   | Icon, Capsule, IconButton, Segmented, Switch, Stepper, BrandMark                                        |
| `apps/web/src/components/overlays/`                                                                                                          | 10   | Sheet, Island, AlertDialog, ShortcutsHud, DropOverlay                                                   |
| `apps/web/src/components/shell/`                                                                                                             | 13   | AppShell, Sidebar, Toolbar, TabBar                                                                      |
| `apps/web/src/components/importer/`                                                                                                          | 13   | Importer with platform chips and playlist choice                                                        |
| `apps/web/src/components/queue/`                                                                                                             | 11   | QueueView, QueueRow, ProgressRing, RowSkeleton                                                          |
| `apps/web/src/components/inspector/`                                                                                                         | 11   | Inspector, Artwork, OptionsPanel, QualityList, TrimEditor, SubtitleOptions, StatusCard, InspectorFooter |
| `apps/web/src/components/history/`, `settings/`, `auth/`                                                                                     | 12   | History view, settings sheet, login screen                                                              |
| `apps/web/src/app/manifest.ts`, `apps/web/src/app/icon.svg`, `apps/web/src/app/apple-icon.tsx`, `apps/web/src/app/pwa-icon/[size]/route.tsx` | 12   | PWA                                                                                                     |

### Repository and docs

| File                                                                                                                                                      | Task   | Responsibility                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| `LICENSE`, `NOTICE`, `README.md`, `README.vi.md`                                                                                                          | 14     | Licensing and landing documentation |
| `docs/index.md`, `docs/getting-started.md`, `docs/configuration.md`, `docs/usage.md`, `docs/deployment.md`, `docs/troubleshooting.md`, `docs/security.md` | 14     | Documentation site                  |
| `docs/decisions/0001-*.md` to `docs/decisions/0005-*.md`                                                                                                  | 14     | ADRs                                |
| `docs/public/logo.svg`, `docs/public/screenshots/`                                                                                                        | 14, 15 | Brand and screenshots               |

---

### Task 1: API foundation (dependencies, settings, errors, readiness)

**Files:**

- Modify: `apps/api/pyproject.toml` (via `uv add`), `apps/api/uv.lock`
- Create: `apps/api/app/config.py`, `apps/api/app/errors.py`, `apps/api/tests/conftest.py`, `apps/api/tests/test_config.py`
- Modify: `apps/api/app/health.py`, `apps/api/tests/test_health.py`

**Interfaces:**

- Produces: `Settings` (frozen dataclass) with fields `data_dir: Path, password: str, secret_key: str, retention_minutes: int, max_concurrent: int, max_filesize_mb: int, max_storage_gb: int, max_playlist_items: int, rate_limit_per_minute: int, stall_timeout_seconds: float, allow_private_urls: bool, trusted_proxy_hops: int, ytdlp_proxy: str` and properties `downloads_dir, cookies_file, settings_file, secret_key_file, ytdlp_dir`; `load_settings() -> Settings`; `ApiError(status: int, code: str, message: str, headers: Mapping[str, str] | None = None)`; `register_error_handlers(app: Flask) -> None`; pytest fixture `settings(tmp_path) -> Settings`.

- [ ] **Step 1: Add the download engine dependency**

Run from `apps/api`:

```bash
mise exec -- uv add "yt-dlp[default,deno,curl-cffi]==2026.8.19"
```

Expected: `pyproject.toml` lists the dependency and `uv.lock` updates.

- [ ] **Step 2: Write the failing settings tests**

`apps/api/tests/conftest.py`:

```python
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest

from app.config import Settings


def make_settings(data_dir: Path, **overrides: Any) -> Settings:
    base = Settings(
        data_dir=data_dir,
        password="",
        secret_key="test-secret-key",
        retention_minutes=60,
        max_concurrent=3,
        max_filesize_mb=4096,
        max_storage_gb=0,
        max_playlist_items=50,
        rate_limit_per_minute=30,
        stall_timeout_seconds=180,
        allow_private_urls=False,
        trusted_proxy_hops=1,
        ytdlp_proxy="",
    )
    return replace(base, **overrides)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)
```

`apps/api/tests/test_config.py`:

```python
from pathlib import Path

import pytest

from app.config import load_settings


def test_defaults_point_at_data_volume(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("OPENMEDIA_DATA_DIR", "OPENMEDIA_MAX_CONCURRENT", "OPENMEDIA_ALLOW_PRIVATE_URLS"):
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
```

- [ ] **Step 3: Run the tests to see them fail**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_config.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.config'`.

- [ ] **Step 4: Implement settings and errors**

`apps/api/app/config.py`:

```python
import os
from dataclasses import dataclass
from pathlib import Path

TRUE_VALUES = frozenset({"1", "true", "yes", "on"})


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
        password=os.environ.get("OPENMEDIA_PASSWORD", ""),
        secret_key=_text("OPENMEDIA_SECRET_KEY", ""),
        retention_minutes=_integer("OPENMEDIA_RETENTION_MINUTES", 60, 1, 10080),
        max_concurrent=_integer("OPENMEDIA_MAX_CONCURRENT", 3, 1, 5),
        max_filesize_mb=_integer("OPENMEDIA_MAX_FILESIZE_MB", 4096, 1, 1048576),
        max_storage_gb=_integer("OPENMEDIA_MAX_STORAGE_GB", 0, 0, 1048576),
        max_playlist_items=_integer("OPENMEDIA_MAX_PLAYLIST_ITEMS", 50, 1, 500),
        rate_limit_per_minute=_integer("OPENMEDIA_RATE_LIMIT_PER_MINUTE", 30, 1, 10000),
        stall_timeout_seconds=_integer("OPENMEDIA_STALL_TIMEOUT_SECONDS", 180, 10, 3600),
        allow_private_urls=_flag("OPENMEDIA_ALLOW_PRIVATE_URLS", False),
        trusted_proxy_hops=_integer("OPENMEDIA_TRUSTED_PROXY_HOPS", 1, 0, 5),
        ytdlp_proxy=_text("OPENMEDIA_YTDLP_PROXY", ""),
    )
```

`apps/api/app/errors.py`:

```python
from collections.abc import Mapping

from flask import Flask, Response, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.headers = dict(headers or {})


def error_response(status: int, code: str, message: str) -> tuple[Response, int]:
    return jsonify(error=message, code=code), status


def _api_error(error: ApiError) -> tuple[Response, int, dict[str, str]]:
    response, status = error_response(error.status, error.code, error.message)
    return response, status, error.headers


def _http_error(error: HTTPException) -> tuple[Response, int]:
    status = error.code or 500
    code = (error.name or "error").lower().replace(" ", "_")
    return error_response(status, code, error.description or error.name)


def register_error_handlers(app: Flask) -> None:
    app.register_error_handler(ApiError, _api_error)
    app.register_error_handler(HTTPException, _http_error)
```

- [ ] **Step 5: Replace readiness with runtime checks**

`apps/api/app/health.py`:

```python
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
        return jsonify(status="unavailable", reason=f"missing: {', '.join(missing)}"), 503
    return jsonify(status="ok")
```

`apps/api/tests/test_health.py`:

```python
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


def test_ready_names_missing_dependencies(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.health.shutil.which", lambda name: None)
    assert missing_dependencies(tmp_path) == ["ffmpeg"]
    response = make_app(tmp_path).test_client().get("/health/ready")
    assert response.status_code == 503
    assert "ffmpeg" in response.get_json()["reason"]


def test_ready_passes_when_everything_is_present(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.health.shutil.which", lambda name: "/usr/bin/ffmpeg")
    assert make_app(tmp_path).test_client().get("/health/ready").status_code == 200
```

`apps/api/app/__init__.py` stays as generated in this task (it still registers `health`); it sets `app.config["OPENMEDIA_DATA_DIR"] = "/data"` so the readiness route works until Task 6 replaces the factory:

```python
from flask import Flask

from .health import health


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["OPENMEDIA_DATA_DIR"] = "/data"
    app.register_blueprint(health)
    return app
```

- [ ] **Step 6: Run the API checks**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: format, lint, `mypy --strict` and every test pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): add settings, error model and runtime readiness checks"
```

### Task 2: Input validation and network guard

**Files:**

- Create: `apps/api/app/validation.py`, `apps/api/app/network_guard.py`, `apps/api/tests/test_validation.py`, `apps/api/tests/test_network_guard.py`

**Interfaces:**

- Consumes: `ApiError` (Task 1).
- Produces:
  - `validate_url(value: object) -> str`
  - `Trim(start: float, end: float)`, `SubtitleOptions(languages: tuple[str, ...], mode: str)`, `DownloadOptions(kind: str, container: str, quality_height: int | None, format_id: str | None, audio_format: str | None, audio_quality: str | None, trim: Trim | None, subtitles: SubtitleOptions | None, embed_metadata: bool)` with `DownloadOptions.to_json() -> dict[str, object]`
  - `parse_download_options(payload: Mapping[str, object]) -> DownloadOptions`
  - `resolve_host(host: str) -> list[str]`, `ensure_public_url(url: str, resolver: Callable[[str], list[str]] = resolve_host) -> None`

- [ ] **Step 1: Write the failing validation tests**

`apps/api/tests/test_validation.py`:

```python
import pytest

from app.errors import ApiError
from app.validation import DownloadOptions, Trim, parse_download_options, validate_url


@pytest.mark.parametrize(
    "value",
    ["--exec=touch /tmp/pwned", "file:///etc/passwd", "ftp://example.com/a", "https://", "https://exa mple.com", 42, None, "https://example.com/" + "a" * 2100],
)
def test_rejects_unsafe_or_malformed_urls(value: object) -> None:
    with pytest.raises(ApiError) as caught:
        validate_url(value)
    assert caught.value.code == "invalid_url"


def test_accepts_and_trims_http_urls() -> None:
    assert validate_url("  https://www.youtube.com/watch?v=abc  ") == "https://www.youtube.com/watch?v=abc"


def test_reclip_request_maps_to_video_defaults() -> None:
    options = parse_download_options({"url": "https://x.com/a", "format": "video", "format_id": "137"})
    assert options == DownloadOptions(
        kind="video", container="mp4", quality_height=None, format_id="137", audio_format=None,
        audio_quality=None, trim=None, subtitles=None, embed_metadata=True,
    )


def test_reclip_audio_request_defaults_to_mp3() -> None:
    options = parse_download_options({"format": "audio"})
    assert (options.kind, options.audio_format, options.audio_quality) == ("audio", "mp3", "best")


def test_full_request_is_parsed() -> None:
    options = parse_download_options({
        "format": "video", "container": "mkv", "quality_height": 720,
        "trim": {"start": 5, "end": 65.5},
        "subtitles": {"languages": ["vi", "en-US"], "mode": "srt"},
        "embed_metadata": False,
    })
    assert options.container == "mkv"
    assert options.quality_height == 720
    assert options.trim == Trim(start=5.0, end=65.5)
    assert options.subtitles is not None and options.subtitles.languages == ("vi", "en-US")
    assert options.embed_metadata is False


@pytest.mark.parametrize(
    "payload",
    [
        {"format": "gif"},
        {"format_id": "137; rm -rf /"},
        {"container": "avi"},
        {"quality_height": 999},
        {"format": "audio", "audio_format": "aac"},
        {"trim": {"start": 10, "end": 5}},
        {"trim": {"start": -1, "end": 5}},
        {"subtitles": {"languages": ["vi", "en", "fr", "de", "ja", "ko"], "mode": "embed"}},
        {"subtitles": {"languages": ["../x"], "mode": "embed"}},
        {"subtitles": {"languages": ["vi"], "mode": "burn"}},
        {"embed_metadata": "yes"},
    ],
)
def test_invalid_options_are_rejected(payload: dict[str, object]) -> None:
    with pytest.raises(ApiError) as caught:
        parse_download_options(payload)
    assert caught.value.code == "invalid_option"


def test_options_serialize_for_the_job_payload() -> None:
    options = parse_download_options({"format": "audio", "audio_format": "flac"})
    assert options.to_json()["audio_format"] == "flac"
    assert options.to_json()["trim"] is None
```

- [ ] **Step 2: Write the failing network guard tests**

`apps/api/tests/test_network_guard.py`:

```python
from collections.abc import Callable

import pytest

from app.errors import ApiError
from app.network_guard import ensure_public_url


def resolver_for(*addresses: str) -> Callable[[str], list[str]]:
    return lambda host: list(addresses)


@pytest.mark.parametrize("address", ["127.0.0.1", "10.1.2.3", "192.168.1.20", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1", "0.0.0.0"])
def test_private_addresses_are_blocked(address: str) -> None:
    with pytest.raises(ApiError) as caught:
        ensure_public_url("https://internal.example/x", resolver_for(address))
    assert caught.value.code == "private_network"


def test_any_private_address_blocks_the_host() -> None:
    with pytest.raises(ApiError):
        ensure_public_url("https://mixed.example", resolver_for("142.250.1.1", "10.0.0.5"))


def test_public_addresses_pass() -> None:
    ensure_public_url("https://www.youtube.com/watch?v=a", resolver_for("142.250.190.14", "2607:f8b0:4005:80b::200e"))


def test_unresolvable_host_is_invalid() -> None:
    def failing(host: str) -> list[str]:
        raise OSError("no such host")

    with pytest.raises(ApiError) as caught:
        ensure_public_url("https://nope.invalid", failing)
    assert caught.value.code == "invalid_url"
```

- [ ] **Step 3: Run both suites to see them fail**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_validation.py tests/test_network_guard.py`
Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 4: Implement validation**

`apps/api/app/validation.py`:

```python
import re
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from urllib.parse import urlsplit

from .errors import ApiError

MAX_URL_LENGTH = 2048
FORMAT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.+-]{1,64}$")
LANGUAGE_PATTERN = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$")
UNSAFE_URL_CHARACTERS = re.compile(r"[\s\x00-\x1f\x7f]")
MAX_SUBTITLE_LANGUAGES = 5
KINDS = ("video", "audio")
CONTAINERS = ("mp4", "mkv")
AUDIO_FORMATS = ("mp3", "m4a", "opus", "flac", "wav")
AUDIO_QUALITIES = ("320k", "best")
SUBTITLE_MODES = ("embed", "srt")
QUALITY_HEIGHTS = (2160, 1440, 1080, 720, 480, 360)


@dataclass(frozen=True)
class Trim:
    start: float
    end: float


@dataclass(frozen=True)
class SubtitleOptions:
    languages: tuple[str, ...]
    mode: str


@dataclass(frozen=True)
class DownloadOptions:
    kind: str
    container: str
    quality_height: int | None
    format_id: str | None
    audio_format: str | None
    audio_quality: str | None
    trim: Trim | None
    subtitles: SubtitleOptions | None
    embed_metadata: bool

    def to_json(self) -> dict[str, object]:
        data = asdict(self)
        if self.subtitles is not None:
            data["subtitles"] = {"languages": list(self.subtitles.languages), "mode": self.subtitles.mode}
        return data


def invalid_option(message: str) -> ApiError:
    return ApiError(400, "invalid_option", message)


def validate_url(value: object) -> str:
    if not isinstance(value, str):
        raise ApiError(400, "invalid_url", "Provide a link that starts with http:// or https://.")
    url = value.strip()
    parts = urlsplit(url)
    is_valid = (
        len(url) <= MAX_URL_LENGTH
        and parts.scheme in ("http", "https")
        and bool(parts.hostname)
        and not UNSAFE_URL_CHARACTERS.search(url)
    )
    if not is_valid:
        raise ApiError(400, "invalid_url", "Provide a link that starts with http:// or https://.")
    return url


def _choice(payload: Mapping[str, object], key: str, choices: tuple[str, ...], default: str) -> str:
    value = payload.get(key) or default
    if value not in choices:
        raise invalid_option(f"{key} must be one of {', '.join(choices)}.")
    return str(value)


def _format_id(payload: Mapping[str, object]) -> str | None:
    value = payload.get("format_id")
    if value in (None, ""):
        return None
    if not isinstance(value, str) or not FORMAT_ID_PATTERN.fullmatch(value):
        raise invalid_option("format_id is not a valid format identifier.")
    return value


def _quality_height(payload: Mapping[str, object]) -> int | None:
    value = payload.get("quality_height")
    if value is None:
        return None
    if not isinstance(value, int) or isinstance(value, bool) or value not in QUALITY_HEIGHTS:
        raise invalid_option("quality_height must be one of 2160, 1440, 1080, 720, 480, 360.")
    return value


def _number(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise invalid_option(f"trim.{name} must be a number of seconds.")
    return float(value)


def _trim(payload: Mapping[str, object]) -> Trim | None:
    value = payload.get("trim")
    if value is None:
        return None
    if not isinstance(value, Mapping):
        raise invalid_option("trim must be an object with start and end.")
    start, end = _number(value.get("start"), "start"), _number(value.get("end"), "end")
    if start < 0 or start >= end:
        raise invalid_option("trim.start must be at least 0 and before trim.end.")
    return Trim(start=start, end=end)


def _subtitles(payload: Mapping[str, object]) -> SubtitleOptions | None:
    value = payload.get("subtitles")
    if value is None:
        return None
    if not isinstance(value, Mapping) or not isinstance(value.get("languages"), list):
        raise invalid_option("subtitles must contain a languages list.")
    languages = tuple(value["languages"])
    valid = 0 < len(languages) <= MAX_SUBTITLE_LANGUAGES and all(
        isinstance(language, str) and LANGUAGE_PATTERN.fullmatch(language) for language in languages
    )
    if not valid:
        raise invalid_option("subtitles.languages must hold one to five language codes.")
    return SubtitleOptions(languages=languages, mode=_choice(value, "mode", SUBTITLE_MODES, "embed"))


def _embed_metadata(payload: Mapping[str, object]) -> bool:
    value = payload.get("embed_metadata", True)
    if not isinstance(value, bool):
        raise invalid_option("embed_metadata must be true or false.")
    return value


def parse_download_options(payload: Mapping[str, object]) -> DownloadOptions:
    kind = _choice(payload, "format", KINDS, "video")
    is_audio = kind == "audio"
    return DownloadOptions(
        kind=kind,
        container=_choice(payload, "container", CONTAINERS, "mp4"),
        quality_height=None if is_audio else _quality_height(payload),
        format_id=None if is_audio else _format_id(payload),
        audio_format=_choice(payload, "audio_format", AUDIO_FORMATS, "mp3") if is_audio else None,
        audio_quality=_choice(payload, "audio_quality", AUDIO_QUALITIES, "best") if is_audio else None,
        trim=_trim(payload),
        subtitles=None if is_audio else _subtitles(payload),
        embed_metadata=_embed_metadata(payload),
    )
```

When `format` is `video`, an invalid `audio_format` in the payload is ignored because audio options do not apply; the parametrized case `{"format": "audio", "audio_format": "aac"}` covers audio validation.

- [ ] **Step 5: Implement the network guard**

`apps/api/app/network_guard.py`:

```python
import ipaddress
import socket
from collections.abc import Callable
from urllib.parse import urlsplit

from .errors import ApiError

Resolver = Callable[[str], list[str]]


def resolve_host(host: str) -> list[str]:
    return sorted({str(info[4][0]) for info in socket.getaddrinfo(host, None)})


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%", 1)[0])
    mapped = ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) else None
    return (mapped or ip).is_global


def ensure_public_url(url: str, resolver: Resolver = resolve_host) -> None:
    host = urlsplit(url).hostname
    if not host:
        raise ApiError(400, "invalid_url", "The link has no host name.")
    try:
        addresses = resolver(host)
    except OSError as error:
        raise ApiError(400, "invalid_url", f"Could not resolve {host}.") from error
    if not addresses or not all(_is_public(address) for address in addresses):
        raise ApiError(400, "private_network", "Links to private or local network addresses are not allowed.")
```

- [ ] **Step 6: Run the API checks**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): validate download input and block private network targets"
```

### Task 3: yt-dlp command builder, progress parser and extraction

**Files:**

- Create: `apps/api/app/progress.py`, `apps/api/app/ytdlp.py`, `apps/api/tests/test_progress.py`, `apps/api/tests/test_ytdlp.py`

**Interfaces:**

- Consumes: `Settings`, `ApiError`, `DownloadOptions`, `Trim`, `SubtitleOptions`.
- Produces:
  - `progress.PROGRESS_MARKER = "OMPROGRESS"`, `ProgressSample(downloaded_bytes: int | None, total_bytes: int | None, speed_bps: float | None, eta_seconds: int | None)`, `parse_progress_line(line: str) -> ProgressSample | None`, `is_postprocessing_line(line: str) -> bool`, `ProgressTracker` with `percent: float`, `record(sample) -> float`, `record_processing() -> float`
  - `ytdlp.CompletedRun(returncode: int, stdout: str, stderr: str)`, `Runner = Callable[[Sequence[str], float, Mapping[str, str]], CompletedRun]`, `run_command`, `CookieCopier = Callable[[Path], Path | None]`, `ytdlp_environment(settings) -> dict[str, str]`, `DownloadRequest(url: str, options: DownloadOptions, job_dir: Path, max_filesize_mb: int, cookies_file: Path | None, proxy: str)`, `build_download_command(request) -> list[str]`, `build_info_command(url, cookies_file, proxy) -> list[str]`, `build_playlist_command(url, limit, cookies_file, proxy) -> list[str]`, `error_from_output(output: str) -> ApiError`, `summarize_info(info: Mapping[str, Any]) -> dict[str, object]`, `YtDlpClient(settings, copy_cookies: CookieCopier, runner: Runner = run_command)` with `fetch_info(url) -> dict[str, object]` and `fetch_playlist(url, limit) -> dict[str, object]`

- [ ] **Step 1: Write the failing progress tests**

`apps/api/tests/test_progress.py`:

```python
from app.progress import ProgressSample, ProgressTracker, is_postprocessing_line, parse_progress_line


def test_parses_a_full_progress_line() -> None:
    sample = parse_progress_line("OMPROGRESS 1048576 4194304 NA 524288.5 6")
    assert sample == ProgressSample(downloaded_bytes=1048576, total_bytes=4194304, speed_bps=524288.5, eta_seconds=6)


def test_falls_back_to_the_size_estimate() -> None:
    sample = parse_progress_line("OMPROGRESS 100 NA 400.0 NA NA")
    assert sample is not None
    assert (sample.total_bytes, sample.speed_bps, sample.eta_seconds) == (400, None, None)


def test_ignores_other_output() -> None:
    assert parse_progress_line("[youtube] abc: Downloading webpage") is None
    assert parse_progress_line("OMPROGRESS 1 2") is None


def test_detects_postprocessing_lines() -> None:
    assert is_postprocessing_line('[Merger] Merging formats into "media.mp4"')
    assert is_postprocessing_line("[ExtractAudio] Destination: media.mp3")
    assert not is_postprocessing_line("[download] Destination: media.f137.mp4")


def test_two_streams_map_into_one_rising_percentage() -> None:
    tracker = ProgressTracker()
    assert tracker.record(ProgressSample(50, 100, None, None)) == 45.0
    assert tracker.record(ProgressSample(100, 100, None, None)) == 90.0
    assert tracker.record(ProgressSample(10, 20, None, None)) == 94.5
    assert tracker.record_processing() == 99.0
    assert tracker.record(ProgressSample(20, 20, None, None)) == 99.0


def test_unknown_total_keeps_the_percentage() -> None:
    tracker = ProgressTracker()
    assert tracker.record(ProgressSample(500, None, 10.0, None)) == 0.0
```

- [ ] **Step 2: Write the failing yt-dlp tests**

`apps/api/tests/test_ytdlp.py`:

```python
import json
from collections.abc import Mapping, Sequence
from pathlib import Path

import pytest

from app.config import Settings
from app.errors import ApiError
from app.validation import DownloadOptions, SubtitleOptions, Trim, parse_download_options
from app.ytdlp import (
    CompletedRun,
    DownloadRequest,
    YtDlpClient,
    build_download_command,
    build_info_command,
    error_from_output,
    summarize_info,
)

URL = "https://www.youtube.com/watch?v=abc"


def request_for(options: DownloadOptions, cookies: Path | None = None) -> DownloadRequest:
    return DownloadRequest(URL, options, Path("/data/downloads/job1"), 4096, cookies, "")


def value_after(command: list[str], flag: str) -> str:
    return command[command.index(flag) + 1]


def test_url_is_always_the_final_argument_after_the_separator() -> None:
    command = build_download_command(request_for(parse_download_options({})))
    assert command[-2:] == ["--", URL]
    assert value_after(command, "-P") == "/data/downloads/job1"
    assert value_after(command, "-o") == "media.%(ext)s"
    assert value_after(command, "--max-filesize") == "4096M"
    assert "--newline" in command and "--no-playlist" in command


def test_mp4_prefers_compatible_codecs_for_a_chosen_format() -> None:
    command = build_download_command(request_for(parse_download_options({"format_id": "137"})))
    assert value_after(command, "-f") == "137+bestaudio[ext=m4a]/137+bestaudio/best"
    assert value_after(command, "-S") == "vcodec:h264,acodec:aac"
    assert value_after(command, "--merge-output-format") == "mp4"


def test_mkv_with_height_cap_skips_codec_sorting() -> None:
    command = build_download_command(request_for(parse_download_options({"container": "mkv", "quality_height": 720})))
    assert value_after(command, "-f") == "bv*[height<=720]+ba/b[height<=720]/b"
    assert "-S" not in command
    assert value_after(command, "--merge-output-format") == "mkv"


def test_audio_extraction_arguments() -> None:
    command = build_download_command(request_for(parse_download_options({"format": "audio", "audio_format": "m4a", "audio_quality": "320k"})))
    assert value_after(command, "-f") == "ba/b"
    assert "-x" in command
    assert value_after(command, "--audio-format") == "m4a"
    assert value_after(command, "--audio-quality") == "320K"


def test_trim_subtitles_metadata_and_cookies() -> None:
    options = DownloadOptions("video", "mp4", None, None, None, None, Trim(5, 65.5), SubtitleOptions(("vi", "en"), "srt"), True)
    command = build_download_command(request_for(options, Path("/tmp/job/.cookies.txt")))
    assert value_after(command, "--download-sections") == "*5-65.5"
    assert "--force-keyframes-at-cuts" in command
    assert value_after(command, "--sub-langs") == "vi,en"
    assert value_after(command, "--convert-subs") == "srt"
    assert "--embed-subs" not in command
    assert {"--embed-metadata", "--embed-chapters", "--embed-thumbnail"} <= set(command)
    assert value_after(command, "--cookies") == "/tmp/job/.cookies.txt"


def test_wav_skips_thumbnail_embedding() -> None:
    command = build_download_command(request_for(parse_download_options({"format": "audio", "audio_format": "wav"})))
    assert "--embed-thumbnail" not in command
    assert "--embed-metadata" in command


def test_info_command_ends_with_separator_and_url() -> None:
    assert build_info_command(URL, None, "socks5://proxy:1080")[-4:] == ["--proxy", "socks5://proxy:1080", "--", URL]


@pytest.mark.parametrize(
    ("line", "code"),
    [
        ("ERROR: [youtube] abc: Sign in to confirm you're not a bot", "bot_check"),
        ("ERROR: [youtube] abc: Private video. Sign in", "private_video"),
        ("ERROR: The uploader has not made this video available in your country", "geo_blocked"),
        ("ERROR: [youtube] abc: Video unavailable", "unavailable"),
        ("ERROR: Unsupported URL: https://example.com", "unsupported_url"),
        ("ERROR: File is larger than max-filesize (5000 bytes > 10 bytes). Aborting.", "too_large"),
        ("ERROR: something else broke", "extractor_error"),
    ],
)
def test_error_mapping(line: str, code: str) -> None:
    error = error_from_output(f"[info] noise\n{line}\n")
    assert error.code == code


def test_summarize_keeps_best_format_per_height() -> None:
    info = {
        "id": "abc", "title": "Pho", "thumbnail": "https://i.ytimg.com/a.jpg", "duration": 1122,
        "uploader": "Bep", "extractor_key": "Youtube", "webpage_url": URL, "chapters": [{"title": "Intro"}],
        "subtitles": {"vi": [], "en": []},
        "formats": [
            {"format_id": "136", "height": 720, "vcodec": "avc1", "tbr": 900, "ext": "mp4", "filesize": 236},
            {"format_id": "247", "height": 720, "vcodec": "vp9", "tbr": 1200, "ext": "webm", "filesize_approx": 250},
            {"format_id": "137", "height": 1080, "vcodec": "avc1", "tbr": 2000, "ext": "mp4", "filesize": 412},
            {"format_id": "140", "height": None, "vcodec": "none", "ext": "m4a"},
        ],
    }
    summary = summarize_info(info)
    formats = summary["formats"]
    assert isinstance(formats, list)
    assert [entry["id"] for entry in formats] == ["137", "247"]
    assert summary["subtitle_languages"] == ["en", "vi"]
    assert summary["has_chapters"] is True
    assert summary["platform"] == "Youtube"


class RecordingRunner:
    def __init__(self, result: CompletedRun) -> None:
        self.result = result
        self.commands: list[list[str]] = []

    def __call__(self, command: Sequence[str], timeout: float, env: Mapping[str, str]) -> CompletedRun:
        self.commands.append(list(command))
        return self.result


def no_cookies(directory: Path) -> Path | None:
    return None


def test_fetch_info_summarizes_output(settings: Settings) -> None:
    runner = RecordingRunner(CompletedRun(0, json.dumps({"title": "Pho", "formats": []}), ""))
    info = YtDlpClient(settings, no_cookies, runner).fetch_info(URL)
    assert info["title"] == "Pho"
    assert runner.commands[0][-2:] == ["--", URL]


def test_fetch_info_raises_mapped_error(settings: Settings) -> None:
    runner = RecordingRunner(CompletedRun(1, "", "ERROR: [youtube] abc: Sign in to confirm you're not a bot"))
    with pytest.raises(ApiError) as caught:
        YtDlpClient(settings, no_cookies, runner).fetch_info(URL)
    assert caught.value.code == "bot_check"


def test_fetch_playlist_limits_entries(settings: Settings) -> None:
    document = {"title": "Mix", "entries": [{"url": f"https://www.youtube.com/watch?v={n}"} for n in range(5)]}
    runner = RecordingRunner(CompletedRun(0, json.dumps(document), ""))
    playlist = YtDlpClient(settings, no_cookies, runner).fetch_playlist(URL, 3)
    assert playlist == {"title": "Mix", "count": 3, "urls": [f"https://www.youtube.com/watch?v={n}" for n in range(3)]}
    assert runner.commands[0][runner.commands[0].index("--playlist-end") + 1] == "3"
```

- [ ] **Step 3: Run both suites to see them fail**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_progress.py tests/test_ytdlp.py`
Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 4: Implement the progress parser**

`apps/api/app/progress.py`:

```python
from dataclasses import dataclass

PROGRESS_MARKER = "OMPROGRESS"
PROGRESS_FIELD_COUNT = 6
POSTPROCESSOR_TAGS = (
    "[Merger]",
    "[ExtractAudio]",
    "[EmbedSubtitle]",
    "[Metadata]",
    "[EmbedThumbnail]",
    "[FixupM3u8]",
    "[FixupM4a]",
    "[VideoConvertor]",
    "[VideoRemuxer]",
    "[SubtitlesConvertor]",
    "[ThumbnailsConvertor]",
    "[ModifyChapters]",
)
STREAM_RANGES = ((0.0, 90.0), (90.0, 99.0))
PROCESSING_PERCENT = 99.0


@dataclass(frozen=True)
class ProgressSample:
    downloaded_bytes: int | None
    total_bytes: int | None
    speed_bps: float | None
    eta_seconds: int | None


def _number(token: str) -> float | None:
    try:
        value = float(token)
    except ValueError:
        return None
    return value if value >= 0 else None


def _whole(value: float | None) -> int | None:
    return None if value is None else int(value)


def parse_progress_line(line: str) -> ProgressSample | None:
    parts = line.split()
    if len(parts) != PROGRESS_FIELD_COUNT or parts[0] != PROGRESS_MARKER:
        return None
    downloaded, total, estimate, speed, eta = (_number(token) for token in parts[1:])
    return ProgressSample(
        downloaded_bytes=_whole(downloaded),
        total_bytes=_whole(total if total is not None else estimate),
        speed_bps=speed,
        eta_seconds=_whole(eta),
    )


def is_postprocessing_line(line: str) -> bool:
    return line.lstrip().startswith(POSTPROCESSOR_TAGS)


class ProgressTracker:
    def __init__(self) -> None:
        self.percent = 0.0
        self._stream = 0
        self._last_downloaded = -1

    def record(self, sample: ProgressSample) -> float:
        downloaded = sample.downloaded_bytes or 0
        if downloaded < self._last_downloaded and self._stream < len(STREAM_RANGES) - 1:
            self._stream += 1
        self._last_downloaded = downloaded
        if sample.total_bytes:
            low, high = STREAM_RANGES[self._stream]
            fraction = min(downloaded / sample.total_bytes, 1.0)
            self.percent = max(self.percent, low + (high - low) * fraction)
        return self.percent

    def record_processing(self) -> float:
        self.percent = max(self.percent, PROCESSING_PERCENT)
        return self.percent
```

- [ ] **Step 5: Implement the yt-dlp module**

`apps/api/app/ytdlp.py`:

```python
import json
import os
import subprocess
import sys
import tempfile
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Settings
from .errors import ApiError
from .progress import PROGRESS_MARKER
from .validation import DownloadOptions

PROGRESS_TEMPLATE = (
    f"download:{PROGRESS_MARKER} %(progress.downloaded_bytes)s %(progress.total_bytes)s "
    "%(progress.total_bytes_estimate)s %(progress.speed)s %(progress.eta)s"
)
MEDIA_OUTPUT_TEMPLATE = "media.%(ext)s"
INFO_TIMEOUT_SECONDS = 60.0
PLAYLIST_TIMEOUT_SECONDS = 90.0
MAX_ERROR_MESSAGE_LENGTH = 300
ERROR_PATTERNS = (
    ("sign in to confirm", "bot_check", "The site asked to confirm you are not a bot. Add cookies and try again."),
    ("private video", "private_video", "This video is private."),
    ("available in your country", "geo_blocked", "This video is not available in the server's region."),
    ("video unavailable", "unavailable", "This video is unavailable."),
    ("unsupported url", "unsupported_url", "This link is not supported."),
    ("larger than max-filesize", "too_large", "The file is larger than the configured size limit."),
)


@dataclass(frozen=True)
class CompletedRun:
    returncode: int
    stdout: str
    stderr: str


Runner = Callable[[Sequence[str], float, Mapping[str, str]], CompletedRun]
CookieCopier = Callable[[Path], Path | None]


@dataclass(frozen=True)
class DownloadRequest:
    url: str
    options: DownloadOptions
    job_dir: Path
    max_filesize_mb: int
    cookies_file: Path | None
    proxy: str


def run_command(command: Sequence[str], timeout: float, env: Mapping[str, str]) -> CompletedRun:
    try:
        result = subprocess.run(list(command), capture_output=True, text=True, timeout=timeout, env=dict(env), check=False)
    except subprocess.TimeoutExpired as error:
        raise ApiError(504, "timeout", "The site took too long to respond. Try again.") from error
    return CompletedRun(result.returncode, result.stdout, result.stderr)


def base_command() -> list[str]:
    return [sys.executable, "-m", "yt_dlp"]


def ytdlp_environment(settings: Settings) -> dict[str, str]:
    environment = dict(os.environ)
    if (settings.ytdlp_dir / "yt_dlp").is_dir():
        paths = [str(settings.ytdlp_dir), environment.get("PYTHONPATH", "")]
        environment["PYTHONPATH"] = os.pathsep.join(path for path in paths if path)
    return environment


def _network_arguments(cookies_file: Path | None, proxy: str) -> list[str]:
    cookies = ["--cookies", str(cookies_file)] if cookies_file is not None else []
    return [*cookies, *(["--proxy", proxy] if proxy else [])]


def _seconds(value: float) -> str:
    return f"{value:g}"


def _video_arguments(options: DownloadOptions) -> list[str]:
    if options.format_id:
        selector = f"{options.format_id}+bestaudio[ext=m4a]/{options.format_id}+bestaudio/best"
    elif options.quality_height:
        height = options.quality_height
        selector = f"bv*[height<={height}]+ba/b[height<={height}]/b"
    else:
        selector = "bv*+ba/b"
    sorting = ["-S", "vcodec:h264,acodec:aac"] if options.container == "mp4" else []
    return ["-f", selector, *sorting, "--merge-output-format", options.container]


def _audio_arguments(options: DownloadOptions) -> list[str]:
    quality = "320K" if options.audio_quality == "320k" else "0"
    return ["-f", "ba/b", "-x", "--audio-format", options.audio_format or "mp3", "--audio-quality", quality]


def _trim_arguments(options: DownloadOptions) -> list[str]:
    if options.trim is None:
        return []
    section = f"*{_seconds(options.trim.start)}-{_seconds(options.trim.end)}"
    return ["--download-sections", section, "--force-keyframes-at-cuts"]


def _subtitle_arguments(options: DownloadOptions) -> list[str]:
    if options.subtitles is None:
        return []
    delivery = ["--embed-subs"] if options.subtitles.mode == "embed" else ["--convert-subs", "srt"]
    return ["--write-subs", "--write-auto-subs", "--sub-langs", ",".join(options.subtitles.languages), *delivery]


def _metadata_arguments(options: DownloadOptions) -> list[str]:
    if not options.embed_metadata:
        return []
    thumbnail = [] if options.audio_format == "wav" else ["--embed-thumbnail"]
    return ["--embed-metadata", "--embed-chapters", *thumbnail]


def build_download_command(request: DownloadRequest) -> list[str]:
    options = request.options
    selection = _audio_arguments(options) if options.kind == "audio" else _video_arguments(options)
    return [
        *base_command(),
        "--no-playlist", "--newline", "--no-colors", "--no-warnings", "--progress",
        "--progress-template", PROGRESS_TEMPLATE,
        "--max-filesize", f"{request.max_filesize_mb}M",
        "-P", str(request.job_dir), "-o", MEDIA_OUTPUT_TEMPLATE,
        *selection, *_trim_arguments(options), *_subtitle_arguments(options), *_metadata_arguments(options),
        *_network_arguments(request.cookies_file, request.proxy),
        "--", request.url,
    ]


def build_info_command(url: str, cookies_file: Path | None, proxy: str) -> list[str]:
    return [*base_command(), "-J", "--no-playlist", "--no-warnings", *_network_arguments(cookies_file, proxy), "--", url]


def build_playlist_command(url: str, limit: int, cookies_file: Path | None, proxy: str) -> list[str]:
    return [
        *base_command(), "-J", "--flat-playlist", "--playlist-end", str(limit), "--no-warnings",
        *_network_arguments(cookies_file, proxy), "--", url,
    ]


def _last_line(output: str) -> str:
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    return lines[-1] if lines else "yt-dlp failed without output"


def error_from_output(output: str) -> ApiError:
    line = _last_line(output)
    lowered = line.lower()
    for fragment, code, message in ERROR_PATTERNS:
        if fragment in lowered:
            return ApiError(400, code, message)
    detail = line.removeprefix("ERROR:").strip()[:MAX_ERROR_MESSAGE_LENGTH]
    return ApiError(400, "extractor_error", detail)


def first_json_document(stdout: str) -> dict[str, Any]:
    for candidate in (stdout, *stdout.splitlines()):
        try:
            document = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(document, dict):
            return document
    raise ApiError(502, "extractor_error", "yt-dlp returned no data.")


def _best_formats_by_height(formats: Sequence[Mapping[str, Any]]) -> list[dict[str, object]]:
    best: dict[int, Mapping[str, Any]] = {}
    for entry in formats:
        height = entry.get("height")
        if not isinstance(height, int) or entry.get("vcodec", "none") == "none":
            continue
        if height not in best or (entry.get("tbr") or 0) > (best[height].get("tbr") or 0):
            best[height] = entry
    return [
        {"id": str(entry["format_id"]), "label": f"{height}p", "height": height, "ext": entry.get("ext"),
         "filesize": entry.get("filesize") or entry.get("filesize_approx")}
        for height, entry in sorted(best.items(), reverse=True)
    ]


def summarize_info(info: Mapping[str, Any]) -> dict[str, object]:
    return {
        "id": info.get("id"),
        "title": info.get("title") or "",
        "thumbnail": info.get("thumbnail") or "",
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or info.get("channel") or "",
        "platform": info.get("extractor_key") or "",
        "webpage_url": info.get("webpage_url") or "",
        "formats": _best_formats_by_height(info.get("formats") or []),
        "subtitle_languages": sorted((info.get("subtitles") or {}).keys()),
        "has_chapters": bool(info.get("chapters")),
    }


class YtDlpClient:
    def __init__(self, settings: Settings, copy_cookies: CookieCopier, runner: Runner = run_command) -> None:
        self._settings = settings
        self._copy_cookies = copy_cookies
        self._runner = runner

    def _run(self, build: Callable[[Path | None], list[str]], timeout: float) -> dict[str, Any]:
        with tempfile.TemporaryDirectory(prefix="openmedia-") as workdir:
            command = build(self._copy_cookies(Path(workdir)))
            result = self._runner(command, timeout, ytdlp_environment(self._settings))
        if result.returncode != 0:
            raise error_from_output(result.stderr)
        return first_json_document(result.stdout)

    def fetch_info(self, url: str) -> dict[str, object]:
        proxy = self._settings.ytdlp_proxy
        document = self._run(lambda cookies: build_info_command(url, cookies, proxy), INFO_TIMEOUT_SECONDS)
        return summarize_info(document)

    def fetch_playlist(self, url: str, limit: int) -> dict[str, object]:
        proxy = self._settings.ytdlp_proxy
        document = self._run(lambda cookies: build_playlist_command(url, limit, cookies, proxy), PLAYLIST_TIMEOUT_SECONDS)
        entries = document.get("entries") or []
        urls = [str(entry.get("url") or entry.get("webpage_url")) for entry in entries if entry.get("url") or entry.get("webpage_url")]
        return {"title": document.get("title") or "", "count": len(urls[:limit]), "urls": urls[:limit]}
```

- [ ] **Step 6: Run the API checks**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: PASS (ruff format may reflow long lines; run `mise run //apps/api:format-fix` first if `format` fails).

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): build yt-dlp commands, parse progress and map extraction errors"
```

### Task 4: Job engine, runtime settings, storage and retention

**Files:**

- Create: `apps/api/app/settings_store.py`, `apps/api/app/storage.py`, `apps/api/app/jobs.py`, `apps/api/app/cleanup.py`
- Test: `apps/api/tests/test_settings_store.py`, `apps/api/tests/test_storage.py`, `apps/api/tests/test_jobs.py`, `apps/api/tests/test_cleanup.py`

**Interfaces:**

- Consumes: `Settings`, `ApiError`, `DownloadOptions`, `parse_download_options`, `ProgressTracker`, `parse_progress_line`, `is_postprocessing_line`, `DownloadRequest`, `build_download_command`, `error_from_output`, `ytdlp_environment`, `CookieCopier`.
- Produces:
  - `RETENTION_CHOICES = (15, 60, 360, 1440)`, `RuntimeSettings(retention_minutes: int, max_concurrent: int)` with `to_json()`, `parse_runtime_settings(payload, fallback) -> RuntimeSettings`, `SettingsStore(path: Path, defaults: RuntimeSettings)` with `current()` and `update(payload)`
  - `StorageUsage(used_bytes: int, limit_bytes: int | None, free_bytes: int)` with `to_json()`, `storage_usage(downloads_dir: Path, max_storage_gb: int) -> StorageUsage`, `ensure_capacity(usage: StorageUsage) -> None`
  - `JobStatus` (`queued`, `downloading`, `processing`, `done`, `error`, `cancelled`), `Job`, `JobFile`, `ProcessHandle` protocol (`output_lines() -> Iterator[str]`, `wait() -> int`, `terminate() -> None`), `ProcessFactory`, `start_subprocess`, `JobRuntime(settings, store, copy_cookies, process_factory=start_subprocess, now=utc_now)`, `JobManager(runtime)` with `submit(url, title, options) -> Job`, `get(job_id) -> Job`, `list_jobs() -> list[Job]`, `to_json(job) -> dict[str, object]`, `dispatch() -> None`, `cancel_or_remove(job_id) -> None`, `remove_finished_before(cutoff: datetime) -> int`, `known_job_ids() -> set[str]`, `wait_until_idle(timeout: float) -> bool`, `utc_now() -> datetime`
  - `remove_orphan_directories(downloads_dir, known_job_ids) -> int`, `RetentionSweeper(manager, store, now=utc_now)` with `sweep_once() -> int`, `start()`, `stop()`

- [ ] **Step 1: Write the failing settings store and storage tests**

`apps/api/tests/test_settings_store.py`:

```python
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
    SettingsStore(path, DEFAULTS).update({"retention_minutes": 360, "max_concurrent": 5})
    assert json.loads(path.read_text()) == {"retention_minutes": 360, "max_concurrent": 5}
    assert SettingsStore(path, DEFAULTS).current() == RuntimeSettings(360, 5)


def test_partial_update_keeps_other_values(tmp_path: Path) -> None:
    store = SettingsStore(tmp_path / "settings.json", DEFAULTS)
    assert store.update({"max_concurrent": 1}) == RuntimeSettings(60, 1)


@pytest.mark.parametrize("payload", [{"retention_minutes": 30}, {"max_concurrent": 0}, {"max_concurrent": 6}, {"max_concurrent": True}, {"retention_minutes": "60"}])
def test_invalid_updates_are_rejected(tmp_path: Path, payload: dict[str, object]) -> None:
    with pytest.raises(ApiError) as caught:
        SettingsStore(tmp_path / "settings.json", DEFAULTS).update(payload)
    assert caught.value.code == "invalid_option"


def test_corrupt_file_falls_back_to_defaults(tmp_path: Path) -> None:
    path = tmp_path / "settings.json"
    path.write_text("{not json")
    assert SettingsStore(path, DEFAULTS).current() == DEFAULTS
```

`apps/api/tests/test_storage.py`:

```python
from pathlib import Path

import pytest

from app.errors import ApiError
from app.storage import StorageUsage, ensure_capacity, storage_usage


def test_usage_counts_files_recursively(tmp_path: Path) -> None:
    (tmp_path / "job1").mkdir()
    (tmp_path / "job1" / "media.mp4").write_bytes(b"x" * 1500)
    (tmp_path / "loose.bin").write_bytes(b"x" * 500)
    usage = storage_usage(tmp_path, 0)
    assert usage.used_bytes == 2000
    assert usage.limit_bytes is None
    assert usage.free_bytes > 0


def test_limit_is_reported_in_bytes(tmp_path: Path) -> None:
    assert storage_usage(tmp_path, 2).limit_bytes == 2 * 1024**3


def test_missing_directory_counts_as_empty(tmp_path: Path) -> None:
    assert storage_usage(tmp_path / "absent", 0).used_bytes == 0


def test_full_storage_is_refused() -> None:
    with pytest.raises(ApiError) as caught:
        ensure_capacity(StorageUsage(used_bytes=10, limit_bytes=10, free_bytes=100))
    assert (caught.value.status, caught.value.code) == (507, "storage_full")
    ensure_capacity(StorageUsage(used_bytes=9, limit_bytes=10, free_bytes=100))
    ensure_capacity(StorageUsage(used_bytes=10**12, limit_bytes=None, free_bytes=100))
```

- [ ] **Step 2: Implement the settings store and storage**

`apps/api/app/settings_store.py`:

```python
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


def parse_runtime_settings(payload: Mapping[str, object], fallback: RuntimeSettings) -> RuntimeSettings:
    retention = _integer_or_none(payload.get("retention_minutes", fallback.retention_minutes))
    concurrency = _integer_or_none(payload.get("max_concurrent", fallback.max_concurrent))
    if retention is None or (retention != fallback.retention_minutes and retention not in RETENTION_CHOICES):
        raise ApiError(400, "invalid_option", "retention_minutes must be 15, 60, 360 or 1440.")
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
            return parse_runtime_settings(raw, defaults) if isinstance(raw, dict) else defaults
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
```

Because `parse_runtime_settings` compares against the fallback, a retention value equal to the current one is accepted even when it came from the environment (for example 120); any other change must be one of the four choices. The test `{"retention_minutes": 30}` uses the default fallback of 60, so it is rejected.

`apps/api/app/storage.py`:

```python
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path

from .errors import ApiError

BYTES_PER_GIGABYTE = 1024**3


@dataclass(frozen=True)
class StorageUsage:
    used_bytes: int
    limit_bytes: int | None
    free_bytes: int

    def to_json(self) -> dict[str, int | None]:
        return asdict(self)


def directory_size(path: Path) -> int:
    if not path.is_dir():
        return 0
    return sum(entry.stat().st_size for entry in path.rglob("*") if entry.is_file())


def _free_bytes(path: Path) -> int:
    existing = path if path.exists() else path.parent
    return shutil.disk_usage(existing).free


def storage_usage(downloads_dir: Path, max_storage_gb: int) -> StorageUsage:
    limit = max_storage_gb * BYTES_PER_GIGABYTE if max_storage_gb > 0 else None
    return StorageUsage(used_bytes=directory_size(downloads_dir), limit_bytes=limit, free_bytes=_free_bytes(downloads_dir))


def ensure_capacity(usage: StorageUsage) -> None:
    if usage.limit_bytes is not None and usage.used_bytes >= usage.limit_bytes:
        raise ApiError(507, "storage_full", "Server storage is full. Remove finished downloads or raise the limit.")
```

- [ ] **Step 3: Run these suites**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_settings_store.py tests/test_storage.py`
Expected: PASS.

- [ ] **Step 4: Write the failing job engine tests**

`apps/api/tests/test_jobs.py`:

```python
import threading
import time
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from app.config import Settings
from app.errors import ApiError
from app.jobs import JobManager, JobRuntime, JobStatus
from app.settings_store import RuntimeSettings, SettingsStore
from app.validation import parse_download_options

URL = "https://www.youtube.com/watch?v=abc"


class ScriptedProcess:
    def __init__(self, command: Sequence[str], script: "ProcessScript") -> None:
        self.job_dir = Path(command[list(command).index("-P") + 1])
        self.script = script
        self.terminated = threading.Event()

    def output_lines(self) -> Iterator[str]:
        yield from self.script.lines
        while self.script.hold and not (self.script.release.is_set() or self.terminated.is_set()):
            time.sleep(0.01)
        if not self.terminated.is_set():
            for name, size in self.script.files.items():
                (self.job_dir / name).write_bytes(b"x" * size)

    def wait(self) -> int:
        return -15 if self.terminated.is_set() else self.script.returncode

    def terminate(self) -> None:
        self.terminated.set()


class ProcessScript:
    def __init__(self, lines: list[str], files: dict[str, int], returncode: int = 0, hold: bool = False) -> None:
        self.lines = lines
        self.files = files
        self.returncode = returncode
        self.hold = hold
        self.release = threading.Event()
        self.processes: list[ScriptedProcess] = []

    def __call__(self, command: Sequence[str], env: Mapping[str, str]) -> ScriptedProcess:
        process = ScriptedProcess(command, self)
        self.processes.append(process)
        return process


def no_cookies(directory: Path) -> Path | None:
    return None


def make_manager(settings: Settings, script: ProcessScript, concurrency: int = 3) -> JobManager:
    store = SettingsStore(settings.settings_file, RuntimeSettings(60, concurrency))
    return JobManager(JobRuntime(settings=settings, store=store, copy_cookies=no_cookies, process_factory=script))


def test_successful_download_collects_named_files(settings: Settings) -> None:
    script = ProcessScript(["OMPROGRESS 50 100 NA 1000 5", '[Merger] Merging formats into "media.mp4"'], {"media.mp4": 30, "media.vi.srt": 5})
    manager = make_manager(settings, script)
    job = manager.submit(URL, 'Phở: bò/Hà Nội', parse_download_options({"subtitles": {"languages": ["vi"], "mode": "srt"}}))
    assert manager.wait_until_idle(5)
    assert job.status is JobStatus.DONE
    assert job.progress == 100.0
    assert [(f.name, f.kind, f.size_bytes) for f in job.files] == [("Phở bòHà Nội.mp4", "media", 30), ("Phở bòHà Nội.vi.srt", "subtitle", 5)]
    payload = manager.to_json(job)
    assert payload["status"] == "done"
    assert payload["filename"] == "Phở bòHà Nội.mp4"
    assert payload["expires_at"] is not None


def test_failure_maps_the_last_error_line(settings: Settings) -> None:
    script = ProcessScript(["ERROR: [youtube] abc: Sign in to confirm you're not a bot"], {}, returncode=1)
    manager = make_manager(settings, script)
    job = manager.submit(URL, "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    assert (job.status, job.error_code) == (JobStatus.ERROR, "bot_check")


def test_missing_output_file_is_an_error(settings: Settings) -> None:
    manager = make_manager(settings, ProcessScript([], {}))
    job = manager.submit(URL, "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    assert job.error_code == "extractor_error"


def test_concurrency_limit_queues_and_releases(settings: Settings) -> None:
    script = ProcessScript([], {"media.mp4": 1}, hold=True)
    manager = make_manager(settings, script, concurrency=1)
    first = manager.submit(URL, "first", parse_download_options({}))
    second = manager.submit(URL, "second", parse_download_options({}))
    time.sleep(0.05)
    assert first.status is JobStatus.DOWNLOADING
    assert second.status is JobStatus.QUEUED
    assert manager.to_json(second)["queue_position"] == 1
    script.release.set()
    assert manager.wait_until_idle(5)
    assert (first.status, second.status) == (JobStatus.DONE, JobStatus.DONE)


def test_raising_concurrency_starts_queued_jobs(settings: Settings) -> None:
    script = ProcessScript([], {"media.mp4": 1}, hold=True)
    store = SettingsStore(settings.settings_file, RuntimeSettings(60, 1))
    manager = JobManager(JobRuntime(settings=settings, store=store, copy_cookies=no_cookies, process_factory=script))
    manager.submit(URL, "a", parse_download_options({}))
    queued = manager.submit(URL, "b", parse_download_options({}))
    store.update({"max_concurrent": 2})
    manager.dispatch()
    assert queued.status is JobStatus.DOWNLOADING
    script.release.set()
    assert manager.wait_until_idle(5)


def test_cancelling_a_running_job_stops_the_process_and_removes_files(settings: Settings) -> None:
    script = ProcessScript(["OMPROGRESS 10 100 NA NA NA"], {"media.mp4": 1}, hold=True)
    manager = make_manager(settings, script)
    job = manager.submit(URL, "x", parse_download_options({}))
    time.sleep(0.05)
    manager.cancel_or_remove(job.job_id)
    assert manager.wait_until_idle(5)
    assert job.status is JobStatus.CANCELLED
    assert script.processes[0].terminated.is_set()
    assert not (settings.downloads_dir / job.job_id).exists()


def test_cancelling_a_queued_job(settings: Settings) -> None:
    script = ProcessScript([], {"media.mp4": 1}, hold=True)
    manager = make_manager(settings, script, concurrency=1)
    manager.submit(URL, "running", parse_download_options({}))
    queued = manager.submit(URL, "queued", parse_download_options({}))
    manager.cancel_or_remove(queued.job_id)
    assert queued.status is JobStatus.CANCELLED
    script.release.set()
    assert manager.wait_until_idle(5)
    assert len(script.processes) == 1


def test_removing_a_finished_job_deletes_it(settings: Settings) -> None:
    manager = make_manager(settings, ProcessScript([], {"media.mp4": 1}))
    job = manager.submit(URL, "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    manager.cancel_or_remove(job.job_id)
    with pytest.raises(ApiError):
        manager.get(job.job_id)
    assert not (settings.downloads_dir / job.job_id).exists()


def test_stalled_download_times_out(settings: Settings) -> None:
    script = ProcessScript([], {}, hold=True)
    manager = make_manager(replace(settings, stall_timeout_seconds=0.3), script)
    job = manager.submit(URL, "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    assert (job.status, job.error_code) == (JobStatus.ERROR, "timeout")


def test_remove_finished_before_cutoff(settings: Settings) -> None:
    manager = make_manager(settings, ProcessScript([], {"media.mp4": 1}))
    job = manager.submit(URL, "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    assert manager.remove_finished_before(datetime.now(UTC) - timedelta(minutes=5)) == 0
    assert manager.remove_finished_before(datetime.now(UTC) + timedelta(seconds=1)) == 1
    assert manager.known_job_ids() == set()


def test_unknown_job_is_not_found(settings: Settings) -> None:
    with pytest.raises(ApiError) as caught:
        make_manager(settings, ProcessScript([], {})).get("missing")
    assert caught.value.code == "not_found"
```

`apps/api/tests/test_cleanup.py`:

```python
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.cleanup import RetentionSweeper, remove_orphan_directories
from app.config import Settings
from app.jobs import JobManager, JobRuntime
from app.settings_store import RuntimeSettings, SettingsStore
from app.validation import parse_download_options

from .test_jobs import ProcessScript, no_cookies


def test_orphan_directories_are_removed(tmp_path: Path) -> None:
    (tmp_path / "keep").mkdir()
    (tmp_path / "orphan").mkdir()
    (tmp_path / "orphan" / "media.mp4").write_bytes(b"x")
    assert remove_orphan_directories(tmp_path, {"keep"}) == 1
    assert sorted(path.name for path in tmp_path.iterdir()) == ["keep"]


def test_sweeper_uses_the_current_retention(settings: Settings) -> None:
    store = SettingsStore(settings.settings_file, RuntimeSettings(15, 3))
    manager = JobManager(JobRuntime(settings=settings, store=store, copy_cookies=no_cookies, process_factory=ProcessScript([], {"media.mp4": 1})))
    manager.submit("https://www.youtube.com/watch?v=a", "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    later = datetime.now(UTC) + timedelta(minutes=16)
    assert RetentionSweeper(manager, store, now=lambda: later).sweep_once() == 1
```

Add an empty `apps/api/tests/__init__.py` so `from .test_jobs import ...` resolves as a package import.

- [ ] **Step 5: Run the job suites to see them fail**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_jobs.py tests/test_cleanup.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.jobs'`.

- [ ] **Step 6: Implement the job engine**

`apps/api/app/jobs.py`:

```python
import os
import secrets
import shutil
import signal
import subprocess
import threading
import time
from collections import deque
from collections.abc import Callable, Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from pathlib import Path
from typing import Protocol

from .config import Settings
from .errors import ApiError
from .progress import ProgressTracker, is_postprocessing_line, parse_progress_line
from .settings_store import SettingsStore
from .validation import DownloadOptions
from .ytdlp import CookieCopier, DownloadRequest, build_download_command, error_from_output, ytdlp_environment

OUTPUT_TAIL_LINES = 40
MAX_TITLE_LENGTH = 100
TITLE_UNSAFE_CHARACTERS = frozenset('\\/:*?"<>|')
SUBTITLE_SUFFIXES = frozenset({".srt", ".vtt", ".ass", ".lrc"})
PARTIAL_SUFFIXES = frozenset({".part", ".ytdl", ".temp"})
WATCHDOG_INTERVAL_SECONDS = 1.0
TERMINATED_EXIT_CODE = -15


class JobStatus(StrEnum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"
    CANCELLED = "cancelled"


ACTIVE_STATUSES = frozenset({JobStatus.QUEUED, JobStatus.DOWNLOADING, JobStatus.PROCESSING})


class ProcessHandle(Protocol):
    def output_lines(self) -> Iterator[str]: ...

    def wait(self) -> int: ...

    def terminate(self) -> None: ...


ProcessFactory = Callable[[Sequence[str], Mapping[str, str]], ProcessHandle]


class SubprocessHandle:
    def __init__(self, command: Sequence[str], env: Mapping[str, str]) -> None:
        self._process = subprocess.Popen(
            list(command), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
            env=dict(env), start_new_session=True,
        )

    def output_lines(self) -> Iterator[str]:
        stream = self._process.stdout
        return iter(stream.readline, "") if stream is not None else iter(())

    def wait(self) -> int:
        return self._process.wait()

    def terminate(self) -> None:
        try:
            os.killpg(self._process.pid, signal.SIGTERM)
        except ProcessLookupError:
            return


def start_subprocess(command: Sequence[str], env: Mapping[str, str]) -> ProcessHandle:
    return SubprocessHandle(command, env)


def utc_now() -> datetime:
    return datetime.now(UTC)


def isoformat(moment: datetime | None) -> str | None:
    return None if moment is None else moment.isoformat().replace("+00:00", "Z")


@dataclass
class JobFile:
    index: int
    name: str
    kind: str
    size_bytes: int
    path: Path

    def to_json(self) -> dict[str, object]:
        return {"index": self.index, "name": self.name, "kind": self.kind, "size_bytes": self.size_bytes}


@dataclass
class Job:
    job_id: str
    url: str
    title: str
    options: DownloadOptions
    created_at: datetime
    status: JobStatus = JobStatus.QUEUED
    progress: float = 0.0
    speed_bps: float | None = None
    eta_seconds: int | None = None
    downloaded_bytes: int | None = None
    total_bytes: int | None = None
    files: list[JobFile] = field(default_factory=list)
    error: str | None = None
    error_code: str | None = None
    finished_at: datetime | None = None

    @property
    def filename(self) -> str | None:
        return self.files[0].name if self.files else None

    @property
    def is_active(self) -> bool:
        return self.status in ACTIVE_STATUSES


@dataclass(frozen=True)
class JobRuntime:
    settings: Settings
    store: SettingsStore
    copy_cookies: CookieCopier
    process_factory: ProcessFactory = start_subprocess
    now: Callable[[], datetime] = utc_now


@dataclass(frozen=True)
class Outcome:
    returncode: int
    output: str
    stalled: bool
    cookies_file: Path | None


def safe_title(title: str, fallback: str) -> str:
    cleaned = "".join(character for character in title if character not in TITLE_UNSAFE_CHARACTERS)
    return cleaned.strip()[:MAX_TITLE_LENGTH].strip() or fallback


def collect_files(job_dir: Path, title: str, job_id: str) -> list[JobFile]:
    candidates = [
        path for path in sorted(job_dir.iterdir())
        if path.is_file() and not path.name.startswith(".") and path.suffix not in PARTIAL_SUFFIXES
    ]
    media = [path for path in candidates if path.suffix not in SUBTITLE_SUFFIXES]
    if not media:
        return []
    stem = safe_title(title, f"openmedia-{job_id}")
    primary = max(media, key=lambda path: path.stat().st_size)
    subtitles = [path for path in candidates if path.suffix in SUBTITLE_SUFFIXES]
    named = [(primary, f"{stem}{primary.suffix}", "media")]
    named += [(path, f"{stem}.{path.name.split('.', 1)[1]}", "subtitle") for path in subtitles]
    return [JobFile(index, name, kind, path.stat().st_size, path) for index, (path, name, kind) in enumerate(named)]


class StallWatchdog:
    def __init__(self, handle: ProcessHandle, timeout_seconds: float) -> None:
        self._handle = handle
        self._timeout = timeout_seconds
        self._last_activity = time.monotonic()
        self._stopped = threading.Event()
        self.fired = False
        self._thread = threading.Thread(target=self._watch, daemon=True)

    def start(self) -> None:
        self._thread.start()

    def touch(self) -> None:
        self._last_activity = time.monotonic()

    def stop(self) -> None:
        self._stopped.set()

    def _watch(self) -> None:
        interval = min(WATCHDOG_INTERVAL_SECONDS, self._timeout / 4)
        while not self._stopped.wait(interval):
            if time.monotonic() - self._last_activity > self._timeout:
                self.fired = True
                self._handle.terminate()
                return


class JobManager:
    def __init__(self, runtime: JobRuntime) -> None:
        self._runtime = runtime
        self._jobs: dict[str, Job] = {}
        self._handles: dict[str, ProcessHandle] = {}
        self._running: set[str] = set()
        self._cancelled: set[str] = set()
        self._threads: list[threading.Thread] = []
        self._lock = threading.RLock()

    def submit(self, url: str, title: str, options: DownloadOptions) -> Job:
        job = Job(job_id=secrets.token_hex(5), url=url, title=title, options=options, created_at=self._runtime.now())
        with self._lock:
            self._jobs[job.job_id] = job
        self.dispatch()
        return job

    def get(self, job_id: str) -> Job:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None:
            raise ApiError(404, "not_found", "Job not found.")
        return job

    def list_jobs(self) -> list[Job]:
        with self._lock:
            return sorted(self._jobs.values(), key=lambda job: job.created_at, reverse=True)

    def known_job_ids(self) -> set[str]:
        with self._lock:
            return set(self._jobs)

    def _queued_in_order(self) -> list[Job]:
        return [job for job in sorted(self._jobs.values(), key=lambda job: job.created_at) if job.status is JobStatus.QUEUED]

    def queue_position(self, job: Job) -> int:
        with self._lock:
            queued = self._queued_in_order()
        return queued.index(job) + 1 if job in queued else 0

    def _expires_at(self, job: Job) -> datetime | None:
        if job.status is not JobStatus.DONE or job.finished_at is None:
            return None
        return job.finished_at + timedelta(minutes=self._runtime.store.current().retention_minutes)

    def to_json(self, job: Job) -> dict[str, object]:
        with self._lock:
            return {
                "job_id": job.job_id, "url": job.url, "title": job.title, "status": job.status.value,
                "progress": job.progress, "speed_bps": job.speed_bps, "eta_seconds": job.eta_seconds,
                "downloaded_bytes": job.downloaded_bytes, "total_bytes": job.total_bytes,
                "queue_position": self.queue_position(job), "options": job.options.to_json(),
                "filename": job.filename, "files": [entry.to_json() for entry in job.files],
                "error": job.error, "error_code": job.error_code, "created_at": isoformat(job.created_at),
                "finished_at": isoformat(job.finished_at), "expires_at": isoformat(self._expires_at(job)),
            }

    def dispatch(self) -> None:
        with self._lock:
            open_slots = self._runtime.store.current().max_concurrent - len(self._running)
            for job in self._queued_in_order()[: max(open_slots, 0)]:
                job.status = JobStatus.DOWNLOADING
                self._running.add(job.job_id)
                thread = threading.Thread(target=self._run, args=(job,), name=f"job-{job.job_id}", daemon=True)
                self._threads.append(thread)
                thread.start()

    def cancel_or_remove(self, job_id: str) -> None:
        job = self.get(job_id)
        with self._lock:
            was_active = job.is_active
            is_running = job_id in self._running
            if was_active:
                self._mark_cancelled(job)
            else:
                del self._jobs[job_id]
            handle = self._handles.get(job_id)
        if handle is not None:
            handle.terminate()
        if not is_running:
            self._remove_directory(job)
        self.dispatch()

    def remove_finished_before(self, cutoff: datetime) -> int:
        with self._lock:
            expired = [job for job in self._jobs.values() if not job.is_active and job.finished_at is not None and job.finished_at < cutoff]
            for job in expired:
                del self._jobs[job.job_id]
        for job in expired:
            self._remove_directory(job)
        return len(expired)

    def wait_until_idle(self, timeout: float) -> bool:
        deadline = time.monotonic() + timeout
        for thread in list(self._threads):
            thread.join(max(deadline - time.monotonic(), 0))
        return not any(thread.is_alive() for thread in self._threads)

    def _job_dir(self, job: Job) -> Path:
        return self._runtime.settings.downloads_dir / job.job_id

    def _remove_directory(self, job: Job) -> None:
        shutil.rmtree(self._job_dir(job), ignore_errors=True)

    def _mark_cancelled(self, job: Job) -> None:
        self._cancelled.add(job.job_id)
        job.status = JobStatus.CANCELLED
        job.finished_at = self._runtime.now()
        job.speed_bps = None
        job.eta_seconds = None

    def _run(self, job: Job) -> None:
        job_dir = self._job_dir(job)
        job_dir.mkdir(parents=True, exist_ok=True)
        try:
            outcome = self._execute(job, job_dir)
        except OSError as error:
            outcome = Outcome(returncode=1, output=f"ERROR: {error}", stalled=False, cookies_file=None)
        self._finish(job, job_dir, outcome)
        self.dispatch()

    def _execute(self, job: Job, job_dir: Path) -> Outcome:
        settings = self._runtime.settings
        cookies_file = self._runtime.copy_cookies(job_dir)
        request = DownloadRequest(job.url, job.options, job_dir, settings.max_filesize_mb, cookies_file, settings.ytdlp_proxy)
        handle = self._runtime.process_factory(build_download_command(request), ytdlp_environment(settings))
        with self._lock:
            self._handles[job.job_id] = handle
        watchdog = StallWatchdog(handle, settings.stall_timeout_seconds)
        watchdog.start()
        tail: deque[str] = deque(maxlen=OUTPUT_TAIL_LINES)
        tracker = ProgressTracker()
        for line in handle.output_lines():
            watchdog.touch()
            tail.append(line.rstrip())
            self._apply_line(job, tracker, line)
        returncode = handle.wait()
        watchdog.stop()
        return Outcome(returncode, "\n".join(tail), watchdog.fired, cookies_file)

    def _apply_line(self, job: Job, tracker: ProgressTracker, line: str) -> None:
        sample = parse_progress_line(line)
        with self._lock:
            if job.job_id in self._cancelled:
                return
            if sample is not None:
                job.progress = round(tracker.record(sample), 1)
                job.downloaded_bytes, job.total_bytes = sample.downloaded_bytes, sample.total_bytes
                job.speed_bps, job.eta_seconds = sample.speed_bps, sample.eta_seconds
            elif is_postprocessing_line(line):
                job.status = JobStatus.PROCESSING
                job.progress = tracker.record_processing()
                job.speed_bps, job.eta_seconds = None, None

    def _finish(self, job: Job, job_dir: Path, outcome: Outcome) -> None:
        if outcome.cookies_file is not None:
            outcome.cookies_file.unlink(missing_ok=True)
        with self._lock:
            self._handles.pop(job.job_id, None)
            self._running.discard(job.job_id)
            cancelled = job.job_id in self._cancelled
            if not cancelled:
                self._record_outcome(job, job_dir, outcome)
        if cancelled:
            self._remove_directory(job)

    def _record_outcome(self, job: Job, job_dir: Path, outcome: Outcome) -> None:
        job.finished_at = self._runtime.now()
        job.speed_bps, job.eta_seconds = None, None
        if outcome.stalled:
            return self._fail(job, "timeout", "The download stalled and was stopped.")
        if outcome.returncode != 0:
            error = error_from_output(outcome.output)
            return self._fail(job, error.code, error.message)
        files = collect_files(job_dir, job.title, job.job_id)
        if not files:
            return self._fail(job, "extractor_error", "The download finished but no file was found.")
        job.files, job.status, job.progress = files, JobStatus.DONE, 100.0
        return None

    def _fail(self, job: Job, code: str, message: str) -> None:
        job.status, job.error_code, job.error = JobStatus.ERROR, code, message
```

- [ ] **Step 7: Implement retention cleanup**

`apps/api/app/cleanup.py`:

```python
import shutil
import threading
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from .jobs import JobManager, utc_now
from .settings_store import SettingsStore

SWEEP_INTERVAL_SECONDS = 60.0


def remove_orphan_directories(downloads_dir: Path, known_job_ids: set[str]) -> int:
    if not downloads_dir.is_dir():
        return 0
    orphans = [path for path in downloads_dir.iterdir() if path.is_dir() and path.name not in known_job_ids]
    for path in orphans:
        shutil.rmtree(path, ignore_errors=True)
    return len(orphans)


class RetentionSweeper:
    def __init__(self, manager: JobManager, store: SettingsStore, now: Callable[[], datetime] = utc_now) -> None:
        self._manager = manager
        self._store = store
        self._now = now
        self._stopped = threading.Event()
        self._thread = threading.Thread(target=self._loop, name="retention-sweeper", daemon=True)

    def sweep_once(self) -> int:
        cutoff = self._now() - timedelta(minutes=self._store.current().retention_minutes)
        return self._manager.remove_finished_before(cutoff)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stopped.set()

    def _loop(self) -> None:
        while not self._stopped.wait(SWEEP_INTERVAL_SECONDS):
            self.sweep_once()
```

- [ ] **Step 8: Run the API checks**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: PASS. If `mypy --strict` flags `return self._fail(...)` in `_record_outcome`, change those lines to call `self._fail(...)` followed by `return`.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): add the download job engine with retention and storage limits"
```

### Task 5: Cookies and security primitives

**Files:**

- Create: `apps/api/app/cookies.py`, `apps/api/app/security.py`
- Test: `apps/api/tests/test_cookies.py`, `apps/api/tests/test_security.py`

**Interfaces:**

- Consumes: `Settings`, `ApiError`.
- Produces:
  - `COOKIE_COPY_NAME = ".cookies.txt"`, `MAX_COOKIE_BYTES = 1048576`, `CookieRow(domain: str, expires: int)`, `CookieSummary(present: bool, domains: tuple[str, ...], expires_at: datetime | None, uploaded_at: datetime | None)` with `to_json()`, `parse_cookie_rows(text) -> list[CookieRow]`, `validate_cookie_file(raw: bytes) -> str`, `CookieStore(path)` with `summary()`, `save(raw: bytes) -> CookieSummary`, `delete()`, `copy_into(directory: Path) -> Path | None`
  - `load_or_create_secret_key(settings) -> str`, `RateLimiter(per_minute: int, clock=time.monotonic)` with `retry_after(key) -> float | None` and `enforce(key) -> None`, `client_address() -> str`, `ensure_same_origin_request() -> None`, `is_authenticated(settings) -> bool`, `ensure_authenticated(settings) -> None`, `password_matches(settings, candidate: object) -> bool`, `sign_in() -> None`, `sign_out() -> None`, `ForwardedProtoSessionInterface`

- [ ] **Step 1: Write the failing cookie tests**

`apps/api/tests/test_cookies.py`:

```python
import stat
from pathlib import Path

import pytest

from app.cookies import CookieStore, parse_cookie_rows, validate_cookie_file
from app.errors import ApiError

COOKIES = (
    "# Netscape HTTP Cookie File\n"
    ".youtube.com\tTRUE\t/\tTRUE\t1893456000\tSID\tabc\n"
    "#HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t1861920000\tHSID\tdef\n"
    "accounts.google.com\tFALSE\t/\tTRUE\t0\tLSID\tghi\n"
)


def test_rows_include_http_only_entries() -> None:
    rows = parse_cookie_rows(COOKIES)
    assert [(row.domain, row.expires) for row in rows] == [("youtube.com", 1893456000), ("youtube.com", 1861920000), ("accounts.google.com", 0)]


@pytest.mark.parametrize("raw", [b"hello world", b"\xff\xfe", b"x" * (1024 * 1024 + 1)])
def test_invalid_files_are_rejected(raw: bytes) -> None:
    with pytest.raises(ApiError) as caught:
        validate_cookie_file(raw)
    assert caught.value.code == "invalid_cookies"


def test_store_saves_privately_and_summarizes(tmp_path: Path) -> None:
    store = CookieStore(tmp_path / "cookies.txt")
    assert store.summary().present is False
    summary = store.save(COOKIES.encode())
    assert summary.present is True
    assert summary.domains == ("accounts.google.com", "youtube.com")
    assert summary.expires_at is not None and summary.expires_at.year == 2030
    assert stat.S_IMODE((tmp_path / "cookies.txt").stat().st_mode) == 0o600
    assert summary.to_json()["expires_at"] == "2030-01-01T00:00:00Z"


def test_copy_into_and_delete(tmp_path: Path) -> None:
    store = CookieStore(tmp_path / "cookies.txt")
    assert store.copy_into(tmp_path) is None
    store.save(COOKIES.encode())
    job_dir = tmp_path / "job"
    job_dir.mkdir()
    copied = store.copy_into(job_dir)
    assert copied == job_dir / ".cookies.txt"
    assert copied.read_text() == COOKIES
    store.delete()
    assert store.summary().present is False
```

- [ ] **Step 2: Write the failing security tests**

`apps/api/tests/test_security.py`:

```python
from dataclasses import replace

import pytest
from flask import Flask

from app.config import Settings
from app.errors import ApiError
from app.security import (
    RateLimiter,
    ensure_authenticated,
    ensure_same_origin_request,
    is_authenticated,
    load_or_create_secret_key,
    password_matches,
    sign_in,
)


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_rate_limiter_refills_over_time() -> None:
    clock = FakeClock()
    limiter = RateLimiter(2, clock)
    assert limiter.retry_after("a") is None
    assert limiter.retry_after("a") is None
    wait = limiter.retry_after("a")
    assert wait is not None and 29 <= wait <= 30
    assert limiter.retry_after("b") is None
    clock.now = 30.0
    assert limiter.retry_after("a") is None


def test_enforce_sets_retry_after_header() -> None:
    limiter = RateLimiter(1, FakeClock())
    limiter.enforce("a")
    with pytest.raises(ApiError) as caught:
        limiter.enforce("a")
    assert caught.value.status == 429
    assert caught.value.headers["Retry-After"] == "60"


@pytest.mark.parametrize(
    ("headers", "allowed"),
    [
        ({}, True),
        ({"Sec-Fetch-Site": "same-origin"}, True),
        ({"Sec-Fetch-Site": "cross-site"}, False),
        ({"Sec-Fetch-Site": "same-site"}, False),
        ({"Origin": "http://localhost"}, True),
        ({"Origin": "https://evil.example"}, False),
    ],
)
def test_cross_site_guard(headers: dict[str, str], allowed: bool) -> None:
    app = Flask(__name__)
    with app.test_request_context("/api/download", method="POST", headers=headers, base_url="http://localhost"):
        if allowed:
            ensure_same_origin_request()
        else:
            with pytest.raises(ApiError) as caught:
                ensure_same_origin_request()
            assert caught.value.code == "cross_site_request"


def test_safe_methods_skip_the_guard() -> None:
    app = Flask(__name__)
    with app.test_request_context("/api/jobs", method="GET", headers={"Sec-Fetch-Site": "cross-site"}):
        ensure_same_origin_request()


def test_password_session(settings: Settings) -> None:
    protected = replace(settings, password="correct horse")
    app = Flask(__name__)
    app.secret_key = "test"
    with app.test_request_context("/api/jobs"):
        assert is_authenticated(settings) is True
        assert is_authenticated(protected) is False
        with pytest.raises(ApiError) as caught:
            ensure_authenticated(protected)
        assert caught.value.code == "auth_required"
        assert password_matches(protected, "wrong") is False
        assert password_matches(protected, 42) is False
        assert password_matches(protected, "correct horse") is True
        sign_in()
        assert is_authenticated(protected) is True


def test_secret_key_is_generated_once(settings: Settings) -> None:
    generated = replace(settings, secret_key="")
    first = load_or_create_secret_key(generated)
    assert len(first) == 64
    assert load_or_create_secret_key(generated) == first
    assert load_or_create_secret_key(settings) == "test-secret-key"
```

- [ ] **Step 3: Run both suites to see them fail**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_cookies.py tests/test_security.py`
Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 4: Implement cookies**

`apps/api/app/cookies.py`:

```python
import os
import shutil
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from .errors import ApiError

COOKIE_COPY_NAME = ".cookies.txt"
MAX_COOKIE_BYTES = 1024 * 1024
HTTP_ONLY_PREFIX = "#HttpOnly_"
COOKIE_FIELD_COUNT = 7
EXPIRY_FIELD = 4
PRIVATE_FILE_MODE = 0o600


@dataclass(frozen=True)
class CookieRow:
    domain: str
    expires: int


def _iso(moment: datetime | None) -> str | None:
    return None if moment is None else moment.isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class CookieSummary:
    present: bool
    domains: tuple[str, ...]
    expires_at: datetime | None
    uploaded_at: datetime | None

    def to_json(self) -> dict[str, object]:
        return {
            "present": self.present,
            "domains": list(self.domains),
            "expires_at": _iso(self.expires_at),
            "uploaded_at": _iso(self.uploaded_at),
        }


EMPTY_SUMMARY = CookieSummary(present=False, domains=(), expires_at=None, uploaded_at=None)


def parse_cookie_rows(text: str) -> list[CookieRow]:
    rows = []
    for raw_line in text.splitlines():
        line = raw_line.removeprefix(HTTP_ONLY_PREFIX)
        if not line.strip() or line.startswith("#"):
            continue
        fields = line.split("\t")
        if len(fields) == COOKIE_FIELD_COUNT and fields[EXPIRY_FIELD].isdigit():
            rows.append(CookieRow(domain=fields[0].lstrip("."), expires=int(fields[EXPIRY_FIELD])))
    return rows


def validate_cookie_file(raw: bytes) -> str:
    if len(raw) > MAX_COOKIE_BYTES:
        raise ApiError(413, "invalid_cookies", "The cookie file must be 1 MB or smaller.")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ApiError(400, "invalid_cookies", "The cookie file must be UTF-8 text.") from error
    if not parse_cookie_rows(text):
        raise ApiError(400, "invalid_cookies", "This is not a cookies.txt file in Netscape format.")
    return text


def summarize_cookies(text: str, uploaded_at: datetime) -> CookieSummary:
    rows = parse_cookie_rows(text)
    expiries = [row.expires for row in rows if row.expires > 0]
    expires_at = datetime.fromtimestamp(max(expiries), UTC) if expiries else None
    return CookieSummary(True, tuple(sorted({row.domain for row in rows})), expires_at, uploaded_at)


class CookieStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.Lock()

    def summary(self) -> CookieSummary:
        with self._lock:
            if not self._path.is_file():
                return EMPTY_SUMMARY
            text = self._path.read_text(encoding="utf-8")
            uploaded_at = datetime.fromtimestamp(self._path.stat().st_mtime, UTC)
        return summarize_cookies(text, uploaded_at)

    def save(self, raw: bytes) -> CookieSummary:
        text = validate_cookie_file(raw)
        with self._lock:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self._path.with_suffix(".tmp")
            descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, PRIVATE_FILE_MODE)
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                handle.write(text)
            temporary.replace(self._path)
        return self.summary()

    def delete(self) -> None:
        with self._lock:
            self._path.unlink(missing_ok=True)

    def copy_into(self, directory: Path) -> Path | None:
        with self._lock:
            if not self._path.is_file():
                return None
            target = directory / COOKIE_COPY_NAME
            shutil.copyfile(self._path, target)
            target.chmod(PRIVATE_FILE_MODE)
            return target
```

The test expects `expires_at` for year 2030 from the latest expiry `1893456000` (2030-01-01T00:00:00Z); the summary reports the latest expiry because long-lived login cookies decide whether the file still works.

- [ ] **Step 5: Implement security**

`apps/api/app/security.py`:

```python
import hmac
import math
import os
import secrets
import threading
import time
from collections.abc import Callable
from urllib.parse import urlsplit

from flask import Flask, request, session
from flask.sessions import SecureCookieSessionInterface

from .config import Settings
from .errors import ApiError

AUTHENTICATED_SESSION_KEY = "openmedia_authenticated"
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
CROSS_SITE_FETCH_VALUES = frozenset({"cross-site", "same-site"})
SECONDS_PER_MINUTE = 60.0
SECRET_KEY_BYTES = 32
PRIVATE_FILE_MODE = 0o600


def load_or_create_secret_key(settings: Settings) -> str:
    if settings.secret_key:
        return settings.secret_key
    path = settings.secret_key_file
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()
    path.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_hex(SECRET_KEY_BYTES)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, PRIVATE_FILE_MODE)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(key)
    return key


class RateLimiter:
    def __init__(self, per_minute: int, clock: Callable[[], float] = time.monotonic) -> None:
        self._capacity = float(per_minute)
        self._refill_per_second = per_minute / SECONDS_PER_MINUTE
        self._clock = clock
        self._buckets: dict[str, tuple[float, float]] = {}
        self._lock = threading.Lock()

    def retry_after(self, key: str) -> float | None:
        with self._lock:
            now = self._clock()
            tokens, updated = self._buckets.get(key, (self._capacity, now))
            tokens = min(self._capacity, tokens + (now - updated) * self._refill_per_second)
            if tokens < 1:
                self._buckets[key] = (tokens, now)
                return (1 - tokens) / self._refill_per_second
            self._buckets[key] = (tokens - 1, now)
            return None

    def enforce(self, key: str) -> None:
        wait = self.retry_after(key)
        if wait is not None:
            headers = {"Retry-After": str(math.ceil(wait))}
            raise ApiError(429, "rate_limited", "Too many requests. Try again shortly.", headers)


def client_address() -> str:
    return request.remote_addr or "unknown"


def _cross_site_error() -> ApiError:
    return ApiError(403, "cross_site_request", "Requests from other websites are not allowed.")


def ensure_same_origin_request() -> None:
    if request.method in SAFE_METHODS:
        return
    if request.headers.get("Sec-Fetch-Site", "").lower() in CROSS_SITE_FETCH_VALUES:
        raise _cross_site_error()
    origin = request.headers.get("Origin")
    if origin and urlsplit(origin).netloc != request.host:
        raise _cross_site_error()


def is_authenticated(settings: Settings) -> bool:
    return not settings.password or session.get(AUTHENTICATED_SESSION_KEY) is True


def ensure_authenticated(settings: Settings) -> None:
    if not is_authenticated(settings):
        raise ApiError(401, "auth_required", "Sign in to continue.")


def password_matches(settings: Settings, candidate: object) -> bool:
    if not settings.password or not isinstance(candidate, str):
        return False
    return hmac.compare_digest(candidate.encode(), settings.password.encode())


def sign_in() -> None:
    session.clear()
    session[AUTHENTICATED_SESSION_KEY] = True
    session.permanent = True


def sign_out() -> None:
    session.clear()


class ForwardedProtoSessionInterface(SecureCookieSessionInterface):
    def get_cookie_secure(self, app: Flask) -> bool:
        return request.is_secure
```

- [ ] **Step 6: Run the API checks**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): add cookie storage, cross-site guard, rate limiting and optional password"
```

### Task 6: HTTP routes and application factory

**Files:**

- Create: `apps/api/app/services.py`, `apps/api/app/media.py`, `apps/api/tests/test_routes.py`
- Modify: `apps/api/app/__init__.py`

**Interfaces:**

- Consumes: everything from Tasks 1 to 5.
- Produces: `Services(settings, store, cookies, ytdlp, jobs, request_limiter, login_limiter)`, `EXTENSION_KEY = "openmedia"`, `build_services(settings, process_factory=start_subprocess, runner=run_command) -> Services`, `current_services() -> Services`, blueprint `media`, `create_app(settings: Settings | None = None, services: Services | None = None) -> Flask`. The gunicorn entry point stays `app:create_app()`.

- [ ] **Step 1: Write the failing route tests**

`apps/api/tests/test_routes.py`:

```python
import io
import json
from collections.abc import Iterator
from dataclasses import replace

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app import create_app
from app.config import Settings
from app.services import Services, build_services
from app.storage import StorageUsage
from app.ytdlp import CompletedRun

from .test_cookies import COOKIES
from .test_jobs import ProcessScript
from .test_ytdlp import RecordingRunner

URL = "https://www.youtube.com/watch?v=abc"
INFO = {"id": "abc", "title": "Pho", "duration": 1122, "formats": [{"format_id": "137", "height": 1080, "vcodec": "avc1", "tbr": 1}]}


def build(settings: Settings, script: ProcessScript | None = None, output: dict[str, object] | None = None) -> tuple[Flask, Services]:
    runner = RecordingRunner(CompletedRun(0, json.dumps(output or INFO), ""))
    services = build_services(settings, process_factory=script or ProcessScript([], {"media.mp4": 12}), runner=runner)
    return create_app(settings, services), services


@pytest.fixture
def open_settings(settings: Settings) -> Settings:
    return replace(settings, allow_private_urls=True)


@pytest.fixture
def client(open_settings: Settings) -> Iterator[FlaskClient]:
    app, _ = build(open_settings)
    yield app.test_client()


def test_session_without_password(client: FlaskClient) -> None:
    body = client.get("/api/session").get_json()
    assert body == {"auth_required": False, "authenticated": True, "limits": {"max_filesize_mb": 4096, "max_playlist_items": 50}}


def test_password_protects_the_api(open_settings: Settings) -> None:
    app, _ = build(replace(open_settings, password="hunter2"))
    client = app.test_client()
    assert client.get("/api/jobs").get_json()["code"] == "auth_required"
    assert client.post("/api/session", json={"password": "nope"}).status_code == 401
    assert client.post("/api/session", json={"password": "hunter2"}).status_code == 204
    assert client.get("/api/jobs").status_code == 200
    assert client.delete("/api/session").status_code == 204
    assert client.get("/api/jobs").status_code == 401


def test_cross_site_post_is_rejected(client: FlaskClient) -> None:
    response = client.post("/api/info", json={"url": URL}, headers={"Sec-Fetch-Site": "cross-site"})
    assert (response.status_code, response.get_json()["code"]) == (403, "cross_site_request")


def test_info_returns_the_summary(client: FlaskClient) -> None:
    body = client.post("/api/info", json={"url": URL}).get_json()
    assert body["title"] == "Pho"
    assert body["formats"][0] == {"id": "137", "label": "1080p", "height": 1080, "ext": None, "filesize": None}


def test_reclip_injection_payload_is_rejected(client: FlaskClient) -> None:
    response = client.post("/api/info", json={"url": "--exec=touch /tmp/pwned"})
    assert (response.status_code, response.get_json()["code"]) == (400, "invalid_url")
    assert "error" in response.get_json()


def test_private_network_is_blocked_by_default(settings: Settings) -> None:
    app, _ = build(settings)
    response = app.test_client().post("/api/info", json={"url": "http://127.0.0.1:8080/admin"})
    assert response.get_json()["code"] == "private_network"


def test_playlist_is_limited(open_settings: Settings) -> None:
    document = {"title": "Mix", "entries": [{"url": f"{URL}{n}"} for n in range(80)]}
    app, _ = build(open_settings, output=document)
    body = app.test_client().post("/api/playlist", json={"url": URL}).get_json()
    assert body["count"] == 50


def test_reclip_download_flow(open_settings: Settings) -> None:
    app, services = build(open_settings)
    client = app.test_client()
    response = client.post("/api/download", json={"url": URL, "format": "video", "format_id": "137", "title": "Pho bo"})
    assert response.status_code == 202
    job_id = response.get_json()["job_id"]
    assert services.jobs.wait_until_idle(5)
    status = client.get(f"/api/status/{job_id}").get_json()
    assert (status["status"], status["error"], status["filename"]) == ("done", None, "Pho bo.mp4")
    file_response = client.get(f"/api/file/{job_id}")
    assert file_response.status_code == 200
    assert file_response.data == b"x" * 12
    assert "Pho%20bo.mp4" in file_response.headers["Content-Disposition"] or "Pho bo.mp4" in file_response.headers["Content-Disposition"]
    assert client.get(f"/api/file/{job_id}/5").get_json()["code"] == "not_found"


def test_file_not_ready_while_downloading(open_settings: Settings) -> None:
    script = ProcessScript([], {"media.mp4": 1}, hold=True)
    app, services = build(open_settings, script=script)
    client = app.test_client()
    job_id = client.post("/api/download", json={"url": URL}).get_json()["job_id"]
    assert client.get(f"/api/file/{job_id}").get_json()["code"] == "file_not_ready"
    assert client.delete(f"/api/jobs/{job_id}").status_code == 204
    script.release.set()
    assert services.jobs.wait_until_idle(5)
    assert client.get(f"/api/status/{job_id}").get_json()["status"] == "cancelled"


def test_jobs_list_and_remove(client: FlaskClient) -> None:
    job_id = client.post("/api/download", json={"url": URL, "format": "audio"}).get_json()["job_id"]
    jobs = client.get("/api/jobs").get_json()["jobs"]
    assert [job["job_id"] for job in jobs] == [job_id]


def test_storage_full_refuses_downloads(open_settings: Settings, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.media.storage_usage", lambda directory, limit: StorageUsage(10, 10, 0))
    app, _ = build(open_settings)
    response = app.test_client().post("/api/download", json={"url": URL})
    assert (response.status_code, response.get_json()["code"]) == (507, "storage_full")


def test_settings_round_trip(client: FlaskClient) -> None:
    assert client.get("/api/settings").get_json() == {"retention_minutes": 60, "max_concurrent": 3}
    assert client.put("/api/settings", json={"max_concurrent": 5}).get_json()["max_concurrent"] == 5
    assert client.put("/api/settings", json={"retention_minutes": 7}).status_code == 400


def test_storage_reports_usage(client: FlaskClient) -> None:
    body = client.get("/api/storage").get_json()
    assert set(body) == {"used_bytes", "limit_bytes", "free_bytes"}


def test_cookie_upload_and_removal(client: FlaskClient) -> None:
    upload = client.put("/api/cookies", data={"file": (io.BytesIO(COOKIES.encode()), "cookies.txt")}, content_type="multipart/form-data")
    assert upload.status_code == 200
    assert upload.get_json()["domains"] == ["accounts.google.com", "youtube.com"]
    bad = client.put("/api/cookies", data={"file": (io.BytesIO(b"nope"), "cookies.txt")}, content_type="multipart/form-data")
    assert bad.get_json()["code"] == "invalid_cookies"
    assert client.put("/api/cookies", data={}, content_type="multipart/form-data").get_json()["code"] == "invalid_cookies"
    assert client.delete("/api/cookies").status_code == 204
    assert client.get("/api/cookies").get_json()["present"] is False


def test_rate_limit(open_settings: Settings) -> None:
    app, _ = build(replace(open_settings, rate_limit_per_minute=2))
    client = app.test_client()
    client.post("/api/info", json={"url": URL})
    client.post("/api/info", json={"url": URL})
    limited = client.post("/api/info", json={"url": URL})
    assert limited.status_code == 429
    assert "Retry-After" in limited.headers


def test_unknown_route_is_json(client: FlaskClient) -> None:
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"
```

- [ ] **Step 2: Run the suite to see it fail**

Run from `apps/api`: `mise exec -- uv run pytest -q tests/test_routes.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services'`.

- [ ] **Step 3: Implement the services container**

`apps/api/app/services.py`:

```python
from dataclasses import dataclass
from typing import cast

from flask import current_app

from .config import Settings
from .cookies import CookieStore
from .jobs import JobManager, JobRuntime, ProcessFactory, start_subprocess
from .security import RateLimiter
from .settings_store import RuntimeSettings, SettingsStore
from .ytdlp import Runner, YtDlpClient, run_command

EXTENSION_KEY = "openmedia"
LOGIN_ATTEMPTS_PER_MINUTE = 5


@dataclass(frozen=True)
class Services:
    settings: Settings
    store: SettingsStore
    cookies: CookieStore
    ytdlp: YtDlpClient
    jobs: JobManager
    request_limiter: RateLimiter
    login_limiter: RateLimiter


def build_services(
    settings: Settings,
    process_factory: ProcessFactory = start_subprocess,
    runner: Runner = run_command,
) -> Services:
    settings.downloads_dir.mkdir(parents=True, exist_ok=True)
    store = SettingsStore(settings.settings_file, RuntimeSettings(settings.retention_minutes, settings.max_concurrent))
    cookies = CookieStore(settings.cookies_file)
    runtime = JobRuntime(settings=settings, store=store, copy_cookies=cookies.copy_into, process_factory=process_factory)
    return Services(
        settings=settings,
        store=store,
        cookies=cookies,
        ytdlp=YtDlpClient(settings, cookies.copy_into, runner),
        jobs=JobManager(runtime),
        request_limiter=RateLimiter(settings.rate_limit_per_minute),
        login_limiter=RateLimiter(LOGIN_ATTEMPTS_PER_MINUTE),
    )


def current_services() -> Services:
    return cast(Services, current_app.extensions[EXTENSION_KEY])
```

- [ ] **Step 4: Implement the routes**

`apps/api/app/media.py`:

```python
from collections.abc import Mapping

from flask import Blueprint, Response, jsonify, request, send_file

from .errors import ApiError
from .network_guard import ensure_public_url
from .security import (
    client_address,
    ensure_authenticated,
    ensure_same_origin_request,
    is_authenticated,
    password_matches,
    sign_in,
    sign_out,
)
from .services import current_services
from .storage import ensure_capacity, storage_usage
from .validation import parse_download_options, validate_url

media = Blueprint("media", __name__, url_prefix="/api")

PUBLIC_ENDPOINTS = frozenset({"media.session_status", "media.create_session", "media.delete_session"})
MAX_TITLE_LENGTH = 300
NO_CONTENT = ("", 204)


@media.before_request
def guard_request() -> None:
    ensure_same_origin_request()
    if request.endpoint not in PUBLIC_ENDPOINTS:
        ensure_authenticated(current_services().settings)


def json_payload() -> Mapping[str, object]:
    payload = request.get_json(silent=True, force=True)
    if not isinstance(payload, dict):
        raise ApiError(400, "invalid_option", "Send a JSON object.")
    return payload


def checked_url(payload: Mapping[str, object]) -> str:
    url = validate_url(payload.get("url"))
    if not current_services().settings.allow_private_urls:
        ensure_public_url(url)
    return url


def enforce_request_limit() -> None:
    current_services().request_limiter.enforce(client_address())


@media.get("/session")
def session_status() -> Response:
    settings = current_services().settings
    limits = {"max_filesize_mb": settings.max_filesize_mb, "max_playlist_items": settings.max_playlist_items}
    return jsonify(auth_required=bool(settings.password), authenticated=is_authenticated(settings), limits=limits)


@media.post("/session")
def create_session() -> tuple[str, int]:
    services = current_services()
    services.login_limiter.enforce(client_address())
    if services.settings.password and not password_matches(services.settings, json_payload().get("password")):
        raise ApiError(401, "invalid_password", "The password is not correct.")
    sign_in()
    return NO_CONTENT


@media.delete("/session")
def delete_session() -> tuple[str, int]:
    sign_out()
    return NO_CONTENT


@media.post("/info")
def get_info() -> Response:
    enforce_request_limit()
    url = checked_url(json_payload())
    return jsonify(current_services().ytdlp.fetch_info(url))


@media.post("/playlist")
def get_playlist() -> Response:
    enforce_request_limit()
    payload = json_payload()
    maximum = current_services().settings.max_playlist_items
    requested = payload.get("limit")
    limit = requested if isinstance(requested, int) and not isinstance(requested, bool) and 0 < requested < maximum else maximum
    return jsonify(current_services().ytdlp.fetch_playlist(checked_url(payload), limit))


@media.post("/download")
def start_download() -> tuple[Response, int]:
    enforce_request_limit()
    services = current_services()
    payload = json_payload()
    url = checked_url(payload)
    options = parse_download_options(payload)
    ensure_capacity(storage_usage(services.settings.downloads_dir, services.settings.max_storage_gb))
    title = str(payload.get("title") or "")[:MAX_TITLE_LENGTH]
    job = services.jobs.submit(url, title, options)
    return jsonify(job_id=job.job_id, job=services.jobs.to_json(job)), 202


@media.get("/jobs")
def list_jobs() -> Response:
    jobs = current_services().jobs
    return jsonify(jobs=[jobs.to_json(job) for job in jobs.list_jobs()])


@media.get("/status/<job_id>")
def job_status(job_id: str) -> Response:
    jobs = current_services().jobs
    return jsonify(jobs.to_json(jobs.get(job_id)))


@media.delete("/jobs/<job_id>")
def delete_job(job_id: str) -> tuple[str, int]:
    current_services().jobs.cancel_or_remove(job_id)
    return NO_CONTENT


@media.get("/file/<job_id>", defaults={"index": 0})
@media.get("/file/<job_id>/<int:index>")
def download_file(job_id: str, index: int) -> Response:
    job = current_services().jobs.get(job_id)
    if job.status.value != "done":
        raise ApiError(404, "file_not_ready", "The file is not ready yet.")
    if index >= len(job.files):
        raise ApiError(404, "not_found", "File not found.")
    entry = job.files[index]
    return send_file(entry.path, as_attachment=True, download_name=entry.name, conditional=True)


@media.get("/settings")
def get_settings() -> Response:
    return jsonify(current_services().store.current().to_json())


@media.put("/settings")
def update_settings() -> Response:
    services = current_services()
    updated = services.store.update(json_payload())
    services.jobs.dispatch()
    return jsonify(updated.to_json())


@media.get("/storage")
def get_storage() -> Response:
    settings = current_services().settings
    return jsonify(storage_usage(settings.downloads_dir, settings.max_storage_gb).to_json())


@media.get("/cookies")
def get_cookies() -> Response:
    return jsonify(current_services().cookies.summary().to_json())


@media.put("/cookies")
def upload_cookies() -> Response:
    upload = request.files.get("file")
    if upload is None:
        raise ApiError(400, "invalid_cookies", "Choose a cookies.txt file to upload.")
    raw = upload.stream.read(1024 * 1024 + 1)
    return jsonify(current_services().cookies.save(raw).to_json())


@media.delete("/cookies")
def delete_cookies() -> tuple[str, int]:
    current_services().cookies.delete()
    return NO_CONTENT
```

- [ ] **Step 5: Implement the application factory**

`apps/api/app/__init__.py`:

```python
from datetime import timedelta

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from .cleanup import RetentionSweeper, remove_orphan_directories
from .config import Settings, load_settings
from .errors import register_error_handlers
from .health import health
from .media import media
from .security import ForwardedProtoSessionInterface, load_or_create_secret_key
from .services import EXTENSION_KEY, Services, build_services

MAX_REQUEST_BYTES = 2 * 1024 * 1024
SESSION_LIFETIME = timedelta(days=30)


def _configure(app: Flask, settings: Settings) -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    app.config.update(
        SECRET_KEY=load_or_create_secret_key(settings),
        SESSION_COOKIE_NAME="openmedia_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        PERMANENT_SESSION_LIFETIME=SESSION_LIFETIME,
        MAX_CONTENT_LENGTH=MAX_REQUEST_BYTES,
        OPENMEDIA_DATA_DIR=str(settings.data_dir),
    )
    app.session_interface = ForwardedProtoSessionInterface()
    hops = settings.trusted_proxy_hops
    setattr(app, "wsgi_app", ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops, x_host=hops))


def _start_services(settings: Settings) -> Services:
    services = build_services(settings)
    remove_orphan_directories(settings.downloads_dir, services.jobs.known_job_ids())
    RetentionSweeper(services.jobs, services.store).start()
    return services


def create_app(settings: Settings | None = None, services: Services | None = None) -> Flask:
    resolved = settings or load_settings()
    app = Flask(__name__)
    _configure(app, resolved)
    register_error_handlers(app)
    app.register_blueprint(health)
    app.register_blueprint(media)
    app.extensions[EXTENSION_KEY] = services or _start_services(resolved)
    return app
```

Update `apps/api/tests/test_health.py` only if `create_app` imports break it; its tests build their own Flask app and keep passing.

- [ ] **Step 6: Run the API checks**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: PASS. `test_unknown_route_is_json` relies on the `HTTPException` handler mapping "Not Found" to `not_found`.

- [ ] **Step 7: Smoke-test against real yt-dlp**

Run from `apps/api`:

```bash
OPENMEDIA_DATA_DIR=$(mktemp -d) mise exec -- uv run flask --app "app:create_app()" run --port 8095 &
sleep 4
curl -s -X POST localhost:8095/api/info -H 'content-type: application/json' -d '{"url":"https://www.youtube.com/watch?v=jNQXAC9IVRw"}' | head -c 300
kill %1
```

Expected: JSON with `"title": "Me at the zoo"`. If the network is unavailable, record that in the report and continue.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): expose the media API with reclip-compatible routes"
```

### Task 7: API container, compose stack and update policy

**Files:**

- Modify: `apps/api/Dockerfile`, `apps/api/.env.example`, `apps/api/mise.toml`, `apps/api/.dockerignore`, `compose.yaml`, `example.env`, `renovate.json`, `.gitignore`
- Create: `apps/api/docker-entrypoint.sh`

**Interfaces:**

- Consumes: `create_app()` (Task 6), `OPENMEDIA_*` variables (spec 4.2).
- Produces: image `ghcr.io/ttncode/openmedia-api` that serves port 8080 as user `app` (uid 10001) with `/data` as a volume; compose services `web` and `api` with `API_URL=http://api:8080` for `web`; mise task `//apps/api:dev`.

- [ ] **Step 1: Rewrite the runtime stage of the Dockerfile**

Keep the generated `deps` stage and its comment lines untouched. Replace everything from `FROM python:3.13-slim@sha256:... AS runtime` to the end with (keep the same pinned digest line the generator wrote):

```dockerfile
FROM python:3.13-slim@sha256:9d2e5553305c7c7b0097999bb17187c69b921ccd6bc9d40e4bb5ebe652c00285 AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /usr/local/bin/uv /usr/local/bin/uv
COPY --from=deps /app/.venv ./.venv
COPY . .
ENV PATH="/app/.venv/bin:${PATH}" \
    OPENMEDIA_DATA_DIR=/data \
    UV_CACHE_DIR=/data/.cache/uv \
    PYTHONUNBUFFERED=1
RUN useradd --create-home --uid 10001 app \
    && mkdir -p /data/downloads \
    && chown -R app:app /data \
    && chmod 0755 /app/docker-entrypoint.sh
USER app
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health/live')" || exit 1
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "--workers", "1", "--threads", "8", "--timeout", "120", "--bind", "0.0.0.0:8080", "--access-logfile", "-", "app:create_app()"]
```

The `# @SERVICE_SETUP@` anchor was already removed by scaffold for `--db none`; do not re-add it. If `COPY --from=deps /usr/local/bin/uv` fails because the uv image stores the binary elsewhere, find it with `docker run --rm --entrypoint sh ghcr.io/astral-sh/uv:0.12.13-python3.13-trixie-slim -c 'command -v uv'` and use that path.

- [ ] **Step 2: Write the entrypoint**

`apps/api/docker-entrypoint.sh`:

```sh
#!/bin/sh
set -eu

data_dir="${OPENMEDIA_DATA_DIR:-/data}"
mkdir -p "$data_dir/downloads"

if [ "${OPENMEDIA_AUTO_UPDATE_YTDLP:-true}" = "true" ]; then
  echo "openmedia: updating yt-dlp in $data_dir/yt-dlp"
  if ! uv pip install --quiet --python /app/.venv/bin/python --target "$data_dir/yt-dlp" --upgrade "yt-dlp[default]"; then
    echo "openmedia: yt-dlp update failed, using the bundled version"
  fi
fi

exec "$@"
```

Make it executable in git: `git update-index --chmod=+x apps/api/docker-entrypoint.sh` after adding.

- [ ] **Step 3: Development environment and ignores**

`apps/api/.env.example` (replace the generated content):

```dotenv
FLASK_DEBUG=0
OPENMEDIA_DATA_DIR=./data
OPENMEDIA_ALLOW_PRIVATE_URLS=false
OPENMEDIA_AUTO_UPDATE_YTDLP=false
```

Append to `apps/api/mise.toml`:

```toml
[tasks.dev]
env = { OPENMEDIA_DATA_DIR = "./data", OPENMEDIA_TRUSTED_PROXY_HOPS = "1" }
run = "uv run flask --app 'app:create_app()' run --port 8081 --debug"
```

Append `data/` to `apps/api/.dockerignore` and `apps/api/data/` to the root `.gitignore`.

- [ ] **Step 4: Wire the compose stack**

`compose.yaml` services become (keep the header comment block):

```yaml
name: app
services:
  web:
    image: ghcr.io/ttncode/openmedia-web:${IMAGE_TAG:-latest}
    env_file:
      - path: .env
        required: false
    environment:
      API_URL: http://api:8080
    restart: always
    ports:
      - "${WEB_PORT:-8080}:8080"
    depends_on:
      api:
        condition: service_healthy
  api:
    image: ghcr.io/ttncode/openmedia-api:${IMAGE_TAG:-latest}
    env_file:
      - path: .env
        required: false
    restart: always
    ports:
      - "127.0.0.1:${API_PORT:-8081}:8080"
    volumes:
      - openmedia-data:/data
volumes:
  openmedia-data:
```

Append to `example.env`:

```dotenv

OPENMEDIA_PASSWORD=
OPENMEDIA_RETENTION_MINUTES=60
OPENMEDIA_MAX_CONCURRENT=3
OPENMEDIA_MAX_FILESIZE_MB=4096
OPENMEDIA_MAX_STORAGE_GB=0
OPENMEDIA_MAX_PLAYLIST_ITEMS=50
OPENMEDIA_RATE_LIMIT_PER_MINUTE=30
OPENMEDIA_STALL_TIMEOUT_SECONDS=180
OPENMEDIA_ALLOW_PRIVATE_URLS=false
OPENMEDIA_AUTO_UPDATE_YTDLP=true
OPENMEDIA_YTDLP_PROXY=
```

- [ ] **Step 5: Let yt-dlp updates through quickly**

`renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests", "docker:pinDigests"],
  "minimumReleaseAge": "3 days",
  "packageRules": [
    {
      "matchPackageNames": ["yt-dlp", "yt-dlp-ejs"],
      "minimumReleaseAge": "0 days",
      "groupName": "yt-dlp"
    }
  ]
}
```

- [ ] **Step 6: Build and run the image**

```bash
docker build -t openmedia-api:local apps/api
docker volume create openmedia-verify
docker run -d --name openmedia-api-verify -p 127.0.0.1:18081:8080 -v openmedia-verify:/data -e OPENMEDIA_AUTO_UPDATE_YTDLP=false openmedia-api:local
sleep 8
curl -fsS localhost:18081/health/ready
curl -fsS -X POST localhost:18081/api/info -H 'content-type: application/json' -d '{"url":"https://www.youtube.com/watch?v=jNQXAC9IVRw"}' | head -c 200
docker exec openmedia-api-verify sh -c 'command -v ffmpeg deno && id -u'
docker rm -f openmedia-api-verify && docker volume rm openmedia-verify
```

Expected: `{"status":"ok"}`, JSON containing `Me at the zoo`, paths for ffmpeg and deno, uid `10001`. Then run `docker compose config --quiet` from the project root; expected: no output.

- [ ] **Step 7: Run the API checks and commit**

Run from the project root: `mise run //apps/api:ci-unit`
Expected: PASS.

```bash
git add apps/api compose.yaml example.env renovate.json .gitignore
git update-index --chmod=+x apps/api/docker-entrypoint.sh
git commit -m "build(api): ship ffmpeg, deno and a data volume in the API image"
```

### Task 8: Web foundation (tooling, tokens, i18n, API client, proxy)

**Files:**

- Modify: `apps/web/package.json`, `apps/web/pnpm-lock.yaml`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/.env.example`, `apps/web/mise.toml`
- Delete: `apps/web/public/next.svg`, `apps/web/public/vercel.svg`, `apps/web/public/file.svg`, `apps/web/public/globe.svg`, `apps/web/public/window.svg`, `apps/web/src/app/favicon.ico`
- Create: `apps/web/vitest.config.ts`, `apps/web/src/test/setup.ts`, `apps/web/src/app/api/[...path]/route.ts`, `apps/web/src/app/api/[...path]/proxy.ts`, `apps/web/src/app/api/[...path]/proxy.test.ts`, `apps/web/src/lib/api/types.ts`, `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/client.test.ts`, `apps/web/src/lib/links.ts`, `apps/web/src/lib/links.test.ts`, `apps/web/src/lib/format.ts`, `apps/web/src/lib/format.test.ts`, `apps/web/src/lib/i18n/en.ts`, `apps/web/src/lib/i18n/vi.ts`, `apps/web/src/lib/i18n/I18nProvider.tsx`, `apps/web/src/lib/i18n/i18n.test.ts`, `apps/web/src/lib/theme.ts`

**Interfaces:**

- Produces:
  - `types.ts`: `JobStatus`, `DownloadKind = "video" | "audio"`, `Container = "mp4" | "mkv"`, `AudioFormat = "mp3" | "m4a" | "opus" | "flac" | "wav"`, `AudioQuality = "320k" | "best"`, `SubtitleMode = "embed" | "srt"`, `MediaFormat`, `MediaInfo`, `PlaylistInfo`, `DownloadRequest`, `JobOptions`, `JobFile`, `Job`, `SessionInfo`, `RuntimeSettings`, `StorageUsage`, `CookieSummary`, `ApiErrorBody`
  - `client.ts`: `ApiRequestError(status, code, message, retryAfterSeconds)`, `api` object with `session()`, `signIn(password)`, `signOut()`, `info(url)`, `playlist(url)`, `download(request)`, `jobs()`, `removeJob(jobId)`, `settings()`, `updateSettings(patch)`, `storage()`, `cookies()`, `uploadCookies(file)`, `removeCookies()`, and `fileUrl(jobId, index?)`
  - `links.ts`: `PlatformId`, `parseLinks(text) -> string[]`, `detectPlatform(url) -> PlatformId`, `detectPlatforms(urls) -> PlatformId[]`, `hasPlaylist(url) -> boolean`, `linkFromShare({ url, text }) -> string | null`
  - `format.ts`: `Locale = "vi" | "en"`, `formatBytes(bytes, locale)`, `formatSpeed(bytesPerSecond, locale)`, `formatClock(seconds)`, `parseClock(text) -> number | null`, `splitDuration(seconds) -> { hours, minutes, seconds }`
  - `i18n`: `Messages` type (from `en`), `en`, `vi`, `LanguagePreference = "auto" | Locale`, `resolveLocale(preference, navigatorLanguage) -> Locale`, `I18nProvider({ locale, children })`, `useI18n() -> { locale, t: Messages }`
  - `theme.ts`: `ThemePreference = "system" | "light" | "dark"`, `AccentId = "teal" | "blue" | "purple" | "pink" | "orange" | "green" | "graphite"`, `ACCENTS`, `applyTheme(theme)`, `applyAccent(accent)`, `THEME_BOOTSTRAP_SCRIPT`
  - `proxy.ts`: `buildUpstreamUrl(requestUrl, path, apiBaseUrl) -> URL`, `forwardedRequestHeaders(request) -> Headers`, `proxyToApi(request, path, apiBaseUrl, fetchImpl?) -> Promise<Response>`

- [ ] **Step 1: Install dependencies**

Run from `apps/web`:

```bash
mise exec -- pnpm add @phosphor-icons/react
mise exec -- pnpm add -D jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitejs/plugin-react
```

Expected: `package.json` and `pnpm-lock.yaml` update. If pnpm refuses a postinstall build, add the package to `allowBuilds` in `apps/web/pnpm-workspace.yaml` only when it is required to run.

- [ ] **Step 2: Configure vitest**

`apps/web/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    restoreMocks: true,
    css: { modules: { classNameStrategy: "non-scoped" } },
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/app/api/**"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: { name: "node", environment: "node", include: ["src/app/api/**/*.test.ts"] },
      },
    ],
  },
});
```

`apps/web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
```

- [ ] **Step 3: Write the failing library tests**

`apps/web/src/lib/links.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectPlatform, detectPlatforms, hasPlaylist, linkFromShare, parseLinks } from "./links";

describe("links", () => {
  it("parses links separated by spaces, commas and newlines without duplicates", () => {
    const text = "https://youtu.be/a, https://www.tiktok.com/@x/video/1\nhttps://youtu.be/a not-a-link ftp://x.y";
    expect(parseLinks(text)).toEqual(["https://youtu.be/a", "https://www.tiktok.com/@x/video/1"]);
  });

  it("detects platforms by host", () => {
    expect(detectPlatform("https://m.youtube.com/watch?v=1")).toBe("youtube");
    expect(detectPlatform("https://x.com/a/status/1")).toBe("x");
    expect(detectPlatform("https://soundcloud.com/a/b")).toBe("soundcloud");
    expect(detectPlatform("https://example.org/v")).toBe("other");
    expect(detectPlatforms(["https://youtu.be/a", "https://youtube.com/b", "https://vimeo.com/1"])).toEqual(["youtube", "vimeo"]);
  });

  it("recognizes playlist parameters", () => {
    expect(hasPlaylist("https://www.youtube.com/watch?v=a&list=PL1")).toBe(true);
    expect(hasPlaylist("https://www.youtube.com/watch?v=a")).toBe(false);
  });

  it("extracts a link from share target parameters", () => {
    expect(linkFromShare({ url: null, text: "Look https://youtu.be/a nice" })).toBe("https://youtu.be/a");
    expect(linkFromShare({ url: "https://vimeo.com/1", text: null })).toBe("https://vimeo.com/1");
    expect(linkFromShare({ url: null, text: "no link" })).toBeNull();
  });
});
```

`apps/web/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatBytes, formatClock, formatSpeed, parseClock, splitDuration } from "./format";

describe("format", () => {
  it("formats sizes with locale decimal separators", () => {
    expect(formatBytes(1_600_000_000, "vi")).toBe("1,6 GB");
    expect(formatBytes(412_000_000, "en")).toBe("412 MB");
    expect(formatBytes(57_300_000, "vi")).toBe("57,3 MB");
    expect(formatBytes(800, "en")).toBe("0.1 MB");
  });

  it("formats speeds", () => {
    expect(formatSpeed(4_200_000, "vi")).toBe("4,2 MB/s");
  });

  it("formats and parses clocks", () => {
    expect(formatClock(1122)).toBe("18:42");
    expect(formatClock(3735)).toBe("1:02:15");
    expect(parseClock("1:02:15")).toBe(3735);
    expect(parseClock("18:42")).toBe(1122);
    expect(parseClock("90")).toBe(90);
    expect(parseClock("1:xx")).toBeNull();
  });

  it("splits durations", () => {
    expect(splitDuration(3735)).toEqual({ hours: 1, minutes: 2, seconds: 15 });
  });
});
```

`apps/web/src/lib/api/client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "./client";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, ...init });
}

describe("api client", () => {
  it("posts JSON and parses the response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ title: "Pho", formats: [] }));
    const info = await api.info("https://youtu.be/a");
    expect(info.title).toBe("Pho");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/info");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
  });

  it("raises typed errors with retry hints", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ error: "Too many requests.", code: "rate_limited" }, { status: 429, headers: { "retry-after": "12", "content-type": "application/json" } }));
    await expect(api.jobs()).rejects.toMatchObject({ status: 429, code: "rate_limited", retryAfterSeconds: 12 });
  });

  it("maps network failures to api_unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    const error = await api.session().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).code).toBe("api_unreachable");
  });

  it("resolves empty responses for deletes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.removeJob("abc")).resolves.toBeUndefined();
  });

  it("builds file urls", () => {
    expect(api.fileUrl("abc")).toBe("/api/file/abc");
    expect(api.fileUrl("abc", 1)).toBe("/api/file/abc/1");
  });
});
```

`apps/web/src/lib/i18n/i18n.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { resolveLocale } from "./I18nProvider";
import { vi as vietnamese } from "./vi";

function keysOf(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => (typeof child === "object" && child !== null ? keysOf(child, `${prefix}${key}.`) : [`${prefix}${key}`]));
}

describe("i18n", () => {
  it("resolves the browser language", () => {
    expect(resolveLocale("auto", "vi-VN")).toBe("vi");
    expect(resolveLocale("auto", "en-US")).toBe("en");
    expect(resolveLocale("auto", "fr-FR")).toBe("en");
    expect(resolveLocale("vi", "en-US")).toBe("vi");
  });

  it("keeps both dictionaries in sync", () => {
    expect(keysOf(vietnamese).sort()).toEqual(keysOf(en).sort());
  });

  it("contains no dash characters reserved by the style guide", () => {
    const strings = JSON.stringify([en, vietnamese]);
    expect(strings).not.toMatch(/[–—]/);
  });
});
```

`apps/web/src/app/api/[...path]/proxy.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildUpstreamUrl, forwardedRequestHeaders, proxyToApi } from "./proxy";

describe("api proxy", () => {
  it("maps the path and query onto the API base url", () => {
    const url = buildUpstreamUrl("http://localhost:8080/api/status/abc?x=1", ["status", "abc"], "http://api:8080");
    expect(url.toString()).toBe("http://api:8080/api/status/abc?x=1");
  });

  it("forwards host and protocol and drops hop-by-hop headers", () => {
    const request = new Request("http://media.local:8080/api/download", {
      method: "POST",
      headers: { host: "media.local:8080", connection: "keep-alive", cookie: "openmedia_session=1", origin: "http://media.local:8080" },
    });
    const headers = forwardedRequestHeaders(request);
    expect(headers.get("x-forwarded-host")).toBe("media.local:8080");
    expect(headers.get("x-forwarded-proto")).toBe("http");
    expect(headers.get("cookie")).toBe("openmedia_session=1");
    expect(headers.get("connection")).toBeNull();
    expect(headers.get("host")).toBeNull();
  });

  it("streams the upstream response and keeps every set-cookie", async () => {
    const upstreamHeaders = new Headers({ "content-type": "application/json" });
    upstreamHeaders.append("set-cookie", "a=1; Path=/");
    upstreamHeaders.append("set-cookie", "b=2; Path=/");
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 201, headers: upstreamHeaders }));
    const response = await proxyToApi(new Request("http://localhost/api/session", { method: "POST", body: "{}" }), ["session"], "http://api:8080", fetchImpl);
    expect(response.status).toBe(201);
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
    expect(await response.text()).toBe('{"ok":true}');
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
  });

  it("answers 502 when the API is down", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("connect ECONNREFUSED"));
    const response = await proxyToApi(new Request("http://localhost/api/jobs"), ["jobs"], "http://api:8080", fetchImpl);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "The OpenMedia API is not reachable.", code: "api_unreachable" });
  });
});
```

The proxy test runs in the `node` project defined in `vitest.config.ts`, so it needs no per-file environment marker.

- [ ] **Step 4: Run the tests to see them fail**

Run from `apps/web`: `mise exec -- pnpm exec vitest --run`
Expected: FAIL, modules not found.

- [ ] **Step 5: Implement the libraries**

`apps/web/src/lib/links.ts`:

```ts
export type PlatformId = "youtube" | "tiktok" | "instagram" | "soundcloud" | "x" | "facebook" | "vimeo" | "other";

const PLATFORM_HOSTS: ReadonlyArray<readonly [PlatformId, RegExp]> = [
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["soundcloud", /(^|\.)soundcloud\.com$/],
  ["x", /(^|\.)(x\.com|twitter\.com)$/],
  ["facebook", /(^|\.)(facebook\.com|fb\.watch)$/],
  ["vimeo", /(^|\.)vimeo\.com$/],
];

const LINK_PATTERN = /^https?:\/\/[^\s/$.?#].\S*$/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function parseLinks(text: string): string[] {
  const tokens = text.split(/[\s,]+/).filter((token) => LINK_PATTERN.test(token));
  return [...new Set(tokens)];
}

export function detectPlatform(url: string): PlatformId {
  const host = hostOf(url);
  return PLATFORM_HOSTS.find(([, pattern]) => pattern.test(host))?.[0] ?? "other";
}

export function detectPlatforms(urls: readonly string[]): PlatformId[] {
  return [...new Set(urls.map(detectPlatform))];
}

export function hasPlaylist(url: string): boolean {
  try {
    return new URL(url).searchParams.has("list");
  } catch {
    return false;
  }
}

export function linkFromShare({ url, text }: { url: string | null; text: string | null }): string | null {
  return parseLinks([url ?? "", text ?? ""].join(" "))[0] ?? null;
}
```

`apps/web/src/lib/format.ts`:

```ts
export type Locale = "vi" | "en";

const BYTES_PER_MEGABYTE = 1_000_000;
const MEGABYTES_PER_GIGABYTE = 1000;
const MINIMUM_MEGABYTES = 0.1;
const LOCALE_TAGS: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };

function decimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], { maximumFractionDigits: 1 }).format(value);
}

export function formatBytes(bytes: number, locale: Locale): string {
  const megabytes = Math.max(bytes / BYTES_PER_MEGABYTE, MINIMUM_MEGABYTES);
  return megabytes >= MEGABYTES_PER_GIGABYTE ? `${decimal(megabytes / MEGABYTES_PER_GIGABYTE, locale)} GB` : `${decimal(megabytes, locale)} MB`;
}

export function formatSpeed(bytesPerSecond: number, locale: Locale): string {
  return `${formatBytes(bytesPerSecond, locale)}/s`;
}

export function splitDuration(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const whole = Math.max(0, Math.round(totalSeconds));
  return { hours: Math.floor(whole / 3600), minutes: Math.floor((whole % 3600) / 60), seconds: whole % 60 };
}

const pad = (value: number): string => String(value).padStart(2, "0");

export function formatClock(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSeconds);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function parseClock(text: string): number | null {
  const parts = text.trim().split(":");
  const valid = parts.length >= 1 && parts.length <= 3 && parts.every((part) => /^\d+$/.test(part));
  return valid ? parts.reduce((total, part) => total * 60 + Number(part), 0) : null;
}
```

`apps/web/src/lib/api/types.ts`:

```ts
export type JobStatus = "queued" | "downloading" | "processing" | "done" | "error" | "cancelled";
export type DownloadKind = "video" | "audio";
export type Container = "mp4" | "mkv";
export type AudioFormat = "mp3" | "m4a" | "opus" | "flac" | "wav";
export type AudioQuality = "320k" | "best";
export type SubtitleMode = "embed" | "srt";

export interface MediaFormat {
  readonly id: string;
  readonly label: string;
  readonly height: number;
  readonly ext: string | null;
  readonly filesize: number | null;
}

export interface MediaInfo {
  readonly id: string | null;
  readonly title: string;
  readonly thumbnail: string;
  readonly duration: number | null;
  readonly uploader: string;
  readonly platform: string;
  readonly webpage_url: string;
  readonly formats: readonly MediaFormat[];
  readonly subtitle_languages: readonly string[];
  readonly has_chapters: boolean;
}

export interface PlaylistInfo {
  readonly title: string;
  readonly count: number;
  readonly urls: readonly string[];
}

export interface TrimRange {
  readonly start: number;
  readonly end: number;
}

export interface SubtitleSelection {
  readonly languages: readonly string[];
  readonly mode: SubtitleMode;
}

export interface DownloadRequest {
  readonly url: string;
  readonly title: string;
  readonly format: DownloadKind;
  readonly format_id?: string;
  readonly container?: Container;
  readonly quality_height?: number;
  readonly audio_format?: AudioFormat;
  readonly audio_quality?: AudioQuality;
  readonly trim?: TrimRange;
  readonly subtitles?: SubtitleSelection;
  readonly embed_metadata: boolean;
}

export interface JobOptions {
  readonly kind: DownloadKind;
  readonly container: Container;
  readonly quality_height: number | null;
  readonly format_id: string | null;
  readonly audio_format: AudioFormat | null;
  readonly audio_quality: AudioQuality | null;
  readonly trim: TrimRange | null;
  readonly subtitles: SubtitleSelection | null;
  readonly embed_metadata: boolean;
}

export interface JobFile {
  readonly index: number;
  readonly name: string;
  readonly kind: "media" | "subtitle";
  readonly size_bytes: number;
}

export interface Job {
  readonly job_id: string;
  readonly url: string;
  readonly title: string;
  readonly status: JobStatus;
  readonly progress: number;
  readonly speed_bps: number | null;
  readonly eta_seconds: number | null;
  readonly downloaded_bytes: number | null;
  readonly total_bytes: number | null;
  readonly queue_position: number;
  readonly options: JobOptions;
  readonly filename: string | null;
  readonly files: readonly JobFile[];
  readonly error: string | null;
  readonly error_code: string | null;
  readonly created_at: string;
  readonly finished_at: string | null;
  readonly expires_at: string | null;
}

export interface SessionInfo {
  readonly auth_required: boolean;
  readonly authenticated: boolean;
  readonly limits: { readonly max_filesize_mb: number; readonly max_playlist_items: number };
}

export interface RuntimeSettings {
  readonly retention_minutes: number;
  readonly max_concurrent: number;
}

export interface StorageUsage {
  readonly used_bytes: number;
  readonly limit_bytes: number | null;
  readonly free_bytes: number;
}

export interface CookieSummary {
  readonly present: boolean;
  readonly domains: readonly string[];
  readonly expires_at: string | null;
  readonly uploaded_at: string | null;
}

export interface ApiErrorBody {
  readonly error: string;
  readonly code: string;
}
```

`apps/web/src/lib/api/client.ts`:

```ts
import type { CookieSummary, DownloadRequest, Job, MediaInfo, PlaylistInfo, RuntimeSettings, SessionInfo, StorageUsage } from "./types";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const API_PREFIX = "/api";
const UNREACHABLE_STATUS = 0;

function jsonInit(method: string, body?: unknown): RequestInit {
  return body === undefined ? { method } : { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } };
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_PREFIX}${path}`, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    throw new ApiRequestError(UNREACHABLE_STATUS, "api_unreachable", "The OpenMedia API is not reachable.", null);
  }
}

async function errorFrom(response: Response): Promise<ApiRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const retryAfter = Number(response.headers.get("retry-after"));
  return new ApiRequestError(response.status, typeof record.code === "string" ? record.code : "unknown_error", typeof record.error === "string" ? record.error : response.statusText, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as T;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await send(path, init);
  if (!response.ok) throw await errorFrom(response);
}

export const api = {
  session: (): Promise<SessionInfo> => requestJson("/session"),
  signIn: (password: string): Promise<void> => requestVoid("/session", jsonInit("POST", { password })),
  signOut: (): Promise<void> => requestVoid("/session", { method: "DELETE" }),
  info: (url: string): Promise<MediaInfo> => requestJson("/info", jsonInit("POST", { url })),
  playlist: (url: string): Promise<PlaylistInfo> => requestJson("/playlist", jsonInit("POST", { url })),
  download: (request: DownloadRequest): Promise<{ job_id: string; job: Job }> => requestJson("/download", jsonInit("POST", request)),
  jobs: async (): Promise<Job[]> => (await requestJson<{ jobs: Job[] }>("/jobs")).jobs,
  removeJob: (jobId: string): Promise<void> => requestVoid(`/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" }),
  settings: (): Promise<RuntimeSettings> => requestJson("/settings"),
  updateSettings: (patch: Partial<RuntimeSettings>): Promise<RuntimeSettings> => requestJson("/settings", jsonInit("PUT", patch)),
  storage: (): Promise<StorageUsage> => requestJson("/storage"),
  cookies: (): Promise<CookieSummary> => requestJson("/cookies"),
  uploadCookies: (file: File): Promise<CookieSummary> => {
    const body = new FormData();
    body.append("file", file);
    return requestJson("/cookies", { method: "PUT", body });
  },
  removeCookies: (): Promise<void> => requestVoid("/cookies", { method: "DELETE" }),
  fileUrl: (jobId: string, index?: number): string => `${API_PREFIX}/file/${encodeURIComponent(jobId)}${index === undefined ? "" : `/${index}`}`,
};
```

`apps/web/src/app/api/[...path]/proxy.ts`:

```ts
const HOP_BY_HOP_HEADERS = new Set(["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "te", "trailer", "host", "content-length"]);
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export function buildUpstreamUrl(requestUrl: string, path: readonly string[], apiBaseUrl: string): URL {
  const upstream = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, apiBaseUrl);
  upstream.search = new URL(requestUrl).search;
  return upstream;
}

export function forwardedRequestHeaders(request: Request): Headers {
  const incoming = new URL(request.url);
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key)) headers.set(key, value);
  });
  headers.set("x-forwarded-host", request.headers.get("host") ?? incoming.host);
  headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") ?? incoming.protocol.replace(":", ""));
  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key) && key !== "set-cookie") headers.set(key, value);
  });
  upstream.headers.getSetCookie().forEach((cookie) => headers.append("set-cookie", cookie));
  return headers;
}

export async function proxyToApi(request: Request, path: readonly string[], apiBaseUrl: string, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const body = METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer();
  try {
    const upstream = await fetchImpl(buildUpstreamUrl(request.url, path, apiBaseUrl), {
      method: request.method,
      headers: forwardedRequestHeaders(request),
      body,
      redirect: "manual",
      cache: "no-store",
    });
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders(upstream) });
  } catch {
    return Response.json({ error: "The OpenMedia API is not reachable.", code: "api_unreachable" }, { status: 502 });
  }
}
```

`apps/web/src/app/api/[...path]/route.ts`:

```ts
import { proxyToApi } from "./proxy";

export const dynamic = "force-dynamic";

const DEFAULT_API_URL = "http://localhost:8081";

type ProxyContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: ProxyContext): Promise<Response> {
  const { path } = await context.params;
  return proxyToApi(request, path, process.env.API_URL ?? DEFAULT_API_URL);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
```

The existing `apps/web/src/app/api/health/live/route.ts` keeps answering the container health check because a static segment wins over the catch-all.

`apps/web/src/lib/theme.ts`:

```ts
export type ThemePreference = "system" | "light" | "dark";
export type AccentId = "teal" | "blue" | "purple" | "pink" | "orange" | "green" | "graphite";

export const DEFAULT_ACCENT: AccentId = "teal";

export const ACCENTS: ReadonlyArray<{ readonly id: AccentId; readonly swatch: string }> = [
  { id: "teal", swatch: "#12939c" },
  { id: "blue", swatch: "#007aff" },
  { id: "purple", swatch: "#af52de" },
  { id: "pink", swatch: "#ff2d55" },
  { id: "orange", swatch: "#ff9500" },
  { id: "green", swatch: "#34c759" },
  { id: "graphite", swatch: "#8e8e93" },
];

export const PREFERENCES_STORAGE_KEY = "openmedia.preferences";

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = theme;
}

export function applyAccent(accent: AccentId): void {
  document.documentElement.dataset.accent = accent;
}

export const THEME_BOOTSTRAP_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${PREFERENCES_STORAGE_KEY}")||"{}");if(p.theme==="light"||p.theme==="dark"){document.documentElement.dataset.theme=p.theme}document.documentElement.dataset.accent=p.accent||"${DEFAULT_ACCENT}"}catch(e){document.documentElement.dataset.accent="${DEFAULT_ACCENT}"}`;
```

`apps/web/src/lib/i18n/I18nProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "../format";
import { en, type Messages } from "./en";
import { vi } from "./vi";

export type LanguagePreference = "auto" | Locale;

const DICTIONARIES: Record<Locale, Messages> = { en, vi };

export function resolveLocale(preference: LanguagePreference, navigatorLanguage: string): Locale {
  if (preference !== "auto") return preference;
  return navigatorLanguage.toLowerCase().startsWith("vi") ? "vi" : "en";
}

interface I18nValue {
  readonly locale: Locale;
  readonly t: Messages;
}

const I18nContext = createContext<I18nValue>({ locale: "en", t: en });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }): ReactNode {
  const value = useMemo(() => ({ locale, t: DICTIONARIES[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
```

The language preference itself lives in the preferences store (Task 9); the provider only receives the resolved locale.

`apps/web/src/lib/i18n/en.ts`:

```ts
export const en = {
  app: { name: "OpenMedia", sampleNote: "Sample data" },
  nav: { queue: "Queue", downloading: "Downloading", done: "Done", attention: "Needs attention", history: "History", settings: "Settings", other: "More", downloads: "Downloads", showSidebar: "Show sidebar", toggleTheme: "Switch light or dark", shortcuts: "Keyboard shortcuts" },
  importer: {
    label: "Links to download",
    placeholder: "Paste a YouTube, TikTok or SoundCloud link...",
    paste: "Paste",
    fetch: "Get info",
    hint: "Enter gets info, Shift+Enter adds a line, or drop links anywhere",
    pasteFallback: "Press Cmd+V or Ctrl+V to paste",
    noLinks: "No links recognized",
    playlistPrompt: "This link belongs to a playlist.",
    playlistSingle: "Only this video",
    playlistAll: (count: number): string => `Whole playlist (up to ${count} videos)`,
    dropTitle: "Drop links to add them to the queue",
    installHint: "Install OpenMedia on your home screen to share links straight from other apps.",
    dismissInstallHint: "Hide install tip",
  },
  queue: {
    summary: (total: number, active: number, done: number): string => `${total} items, ${active} downloading, ${done} done`,
    startAll: (count: number): string => `Download all (${count})`,
    concurrency: (count: number): string => `Up to ${count} downloads at once`,
    empty: "Nothing here yet. Paste a link to start.",
    download: "Download",
    save: "Save",
    fix: "Fix",
    retry: "Try again",
    cancel: (title: string): string => `Cancel ${title}`,
    removeQueued: "Remove from queue",
    remove: "Remove",
    fetching: "Getting info",
    queued: (position: number): string => `Waiting, position ${position}`,
    processing: "Finishing up",
    doneLine: (format: string, size: string, expiry: string): string => `${format}, ${size}. ${expiry}`,
    downloadingLine: (percent: number, speed: string, remaining: string): string => `${percent}% · ${speed}, ${remaining}`,
    cancelled: "Cancelled",
    listLabel: "Download queue",
  },
  time: {
    secondsLeft: (seconds: number): string => `${seconds} s left`,
    minutesLeft: (minutes: number, seconds: number): string => (seconds === 0 ? `${minutes} min left` : `${minutes} min ${seconds} s left`),
    expiresIn: (minutes: number): string => (minutes >= 60 ? `Deleted in ${Math.round(minutes / 60)} h` : `Deleted in ${minutes} min`),
    retention: { 15: "15 minutes", 60: "1 hour", 360: "6 hours", 1440: "24 hours" },
  },
  inspector: {
    title: "Details",
    done: "Done",
    empty: "Select an item to see its details.",
    kind: "Type",
    video: "Video",
    audio: "Audio",
    format: "Format",
    quality: "Quality",
    qualityBest: "Best available",
    audioOriginal: "Original",
    audioLossless: "Original, lossless",
    trim: "Trim",
    trimStart: "Start",
    trimEnd: "End",
    trimLength: (length: string): string => `Length ${length}`,
    trimHelp: "Drag the yellow handles, or select a handle and use the arrow keys.",
    trimStartHandle: "Start point",
    trimEndHandle: "End point",
    subtitles: "Subtitles",
    subtitlesOff: "Off",
    subtitlesVietnamese: "Vietnamese",
    subtitlesEnglish: "English",
    subtitleEmbed: "Embed in video",
    subtitleFile: "Separate .srt file",
    embedMetadata: "Embed cover and details",
    estimate: "Estimated",
    selection: "Selected part",
    downloadAll: "Download",
    downloadSelection: "Download selection",
    downloadingTitle: (label: string): string => `Downloading ${label}`,
    keepsRunning: "You can close this page; the server keeps downloading.",
    queuedTitle: (position: number): string => `Waiting, position ${position}`,
    queuedHelp: "Starts when a download slot is free.",
    doneTitle: "Download complete",
    saveToDevice: "Save to device",
    subtitleFileName: (name: string): string => `Save ${name}`,
    errorTitle: "Could not download",
    addCookies: "Add cookies to continue",
    cookiesReady: "Cookies for this site are loaded",
    processingTitle: "Finishing up",
    processingHelp: "Merging streams and embedding details.",
    artworkAlt: (title: string): string => `Cover of ${title}`,
  },
  history: {
    title: "History",
    note: "Stored in this browser",
    clear: "Clear history",
    clearTitle: "Clear history?",
    clearMessage: "The list in this browser will be removed. Files on the server are not affected.",
    clearConfirm: "Clear",
    cancel: "Cancel",
    again: "Download again",
    empty: "History is empty.",
  },
  settings: {
    title: "Settings",
    done: "Done",
    cookies: "Cookies",
    cookiesNone: "No cookies yet",
    cookiesLoaded: (domains: string, days: number): string => `Loaded for ${domains}, expires in ${days} days`,
    cookiesChoose: "Choose cookies.txt",
    cookiesRemove: "Remove",
    cookiesNote: "Used for age-restricted videos or when YouTube asks to confirm you are not a bot.",
    downloads: "Downloads",
    retention: "Keep files on the server",
    concurrency: "Simultaneous downloads",
    decrease: "Fewer downloads",
    increase: "More downloads",
    defaultFormat: "Default",
    defaultFormats: { "video-mp4-1080": "Video MP4 1080p", "video-mp4-720": "Video MP4 720p", "audio-m4a": "Audio M4A", "audio-mp3": "Audio MP3 320 kbps" },
    appearance: "Appearance",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    accent: "Accent color",
    accents: { teal: "Teal", blue: "Blue", purple: "Purple", pink: "Pink", orange: "Orange", green: "Green", graphite: "Graphite" },
    language: "Language",
    languages: { auto: "Automatic", vi: "Tiếng Việt", en: "English" },
    access: "Access",
    passwordOn: "Password protection is on",
    passwordOff: "Password protection is off",
    passwordNote: "Set OPENMEDIA_PASSWORD on the server to turn it on.",
    signOut: "Sign out",
    storage: "Storage",
    storageUsed: (used: string, total: string): string => `${used} used of ${total}`,
    storageUsedUnlimited: (used: string, free: string): string => `${used} used, ${free} free`,
  },
  shortcuts: { title: "Keyboard shortcuts", focus: "Enter a link", pasteFetch: "Paste and get info", close: "Close panel", show: "Show shortcuts", dismiss: "Close" },
  auth: { title: "Sign in to OpenMedia", password: "Password", submit: "Sign in", wrong: "The password is not correct." },
  island: {
    fetched: "Info ready",
    playlistAdded: (count: number): string => `Added ${count} videos from the playlist`,
    downloaded: (title: string): string => `Downloaded: ${title}`,
    cancelled: "Download cancelled",
    removedFromQueue: "Removed from queue",
    addedAgain: "Added back to the queue",
    cookiesLoaded: "Cookies loaded",
    cookiesRemoved: "Cookies removed",
    settingsSaved: "Settings saved",
  },
  errors: {
    invalid_url: "That does not look like a link. Paste an address that starts with http:// or https://.",
    unsupported_url: "This site is not supported.",
    private_network: "Links to private or local network addresses are blocked on this server.",
    invalid_option: "One of the download options is not valid.",
    not_found: "That item no longer exists on the server.",
    file_not_ready: "The file is not ready yet.",
    rate_limited: "Too many requests. Wait a moment and try again.",
    auth_required: "Sign in to continue.",
    invalid_password: "The password is not correct.",
    cross_site_request: "The request was blocked because it came from another website.",
    storage_full: "Server storage is full. Remove finished downloads first.",
    too_large: "The file is larger than this server allows.",
    bot_check: "The site asked to confirm you are not a bot. Add cookies in Settings.",
    private_video: "This video is private.",
    geo_blocked: "This video is not available in the server's region.",
    unavailable: "This video is unavailable.",
    timeout: "The site took too long to respond. Try again.",
    extractor_error: "The site could not be read. Try again later.",
    invalid_cookies: "That file is not a cookies.txt file in Netscape format.",
    api_unreachable: "The OpenMedia server is not reachable.",
    unknown_error: "Something went wrong. Try again.",
  },
};

export type Messages = typeof en;
```

`apps/web/src/lib/i18n/vi.ts` exports `export const vi: Messages = { ... }` with the same keys in natural Vietnamese (use the prototype copy for wording, for example "Hàng đợi", "Dán liên kết YouTube, TikTok, SoundCloud...", "Lấy thông tin", "Tải tất cả (n)", "Tối đa n lượt tải cùng lúc", "Kéo hai tay nắm vàng, hoặc chọn một tay nắm rồi dùng phím mũi tên.", "Dùng cho video giới hạn tuổi hoặc khi YouTube yêu cầu xác minh.", "Đặt biến OPENMEDIA_PASSWORD để bật."). Every function keeps the English parameter list; numbers are formatted by the caller. No en or em dash characters.

- [ ] **Step 6: Port the design tokens and base styles**

Replace `apps/web/src/app/globals.css` with the concatenation of the prototype's `tokens.css` and `base.css`, with these changes:

- Keep `@import "tailwindcss";` as the first line.
- Change the bare `:root` accent block to the teal defaults (`--accent-l: #12939c; --accent-d: #3fbac2; --accent-text-l: #0b7178; --accent-text-d: #5cc9d0;`), add a `:root[data-accent="blue"]` rule with the prototype's blue values, and delete the teal rule that duplicates the defaults.
- Set `--font-text` to `-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-inter), "Segoe UI Variable Text", system-ui, sans-serif`, `--font-display` to the same with `"SF Pro Display"`, `--font-mono` to `ui-monospace, "SF Mono", var(--font-geist-mono), Menlo, Consolas, monospace`, and add `--font-brand: var(--font-geist-sans), var(--font-text)`.
- Remove the `body { overflow: hidden; }` line from `base.css` only for widths below 768 px (phones scroll the document); keep it for 768 px and up.
- Delete the `.brand-mark`, `.capsule`, `.icon-button`, `kbd`, `.sample-tag`, `.glass` rules from the global file; those move into component modules in Task 10. Keep resets, tokens, keyframes, `:focus-visible`, `.visually-hidden` and the reduced-motion block.

- [ ] **Step 7: Replace the layout and page**

`apps/web/src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext", "vietnamese"] });

export const metadata: Metadata = {
  title: "OpenMedia",
  description: "Download videos from almost any website. Lightweight, self-hosted media downloader with a clean web UI.",
  applicationName: "OpenMedia",
  appleWebApp: { capable: true, title: "OpenMedia", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1e20" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" data-accent="teal" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/src/app/page.tsx` for this task renders a minimal branded placeholder that Task 10 replaces with the application shell:

```tsx
import type { ReactNode } from "react";

export default function Home(): ReactNode {
  return <main id="openmedia-root" />;
}
```

`apps/web/.env.example`:

```dotenv
API_URL=http://localhost:8081
```

Append to `apps/web/mise.toml`:

```toml
[tasks.dev]
env = { API_URL = "http://localhost:8081" }
run = "pnpm exec next dev --port 3000"
```

Delete the generator's sample assets listed under **Files**.

- [ ] **Step 8: Run the web checks**

Run from the project root: `mise run //apps/web:ci-unit`
Expected: format, lint, typecheck and all tests pass. Run `mise run //apps/web:format-fix` first when only formatting fails.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the API proxy, typed client, i18n dictionaries and design tokens"
```

### Task 9: Client state, persistence, commands and polling

**Files:**

- Create: `apps/web/src/state/types.ts`, `apps/web/src/state/options.ts`, `apps/web/src/state/options.test.ts`, `apps/web/src/state/reducer.ts`, `apps/web/src/state/reducer.test.ts`, `apps/web/src/lib/preferences.ts`, `apps/web/src/lib/preferences.test.ts`, `apps/web/src/state/commands.ts`, `apps/web/src/state/commands.test.ts`, `apps/web/src/state/useJobPolling.ts`, `apps/web/src/state/StoreProvider.tsx`

**Interfaces:**

- Consumes: `api`, `ApiRequestError`, types from `lib/api/types.ts`, `PlatformId`, `detectPlatform`, `ThemePreference`, `AccentId`, `LanguagePreference`.
- Produces:
  - `types.ts`: `Filter = "all" | "active" | "done" | "error"`, `View = "queue" | "history"`, `DefaultFormatId = "video-mp4-1080" | "video-mp4-720" | "audio-m4a" | "audio-mp3"`, `DraftOptions`, `MediaSnapshot`, `QueueItem` (union `FetchingItem | FetchErrorItem | ReadyItem | JobItem`), `HistoryEntry`, `Preferences`, `Notice`, `AppState`, `Action`
  - `options.ts`: `defaultDraft(defaultFormat, formats) -> DraftOptions`, `toDownloadRequest(item: ReadyItem) -> DownloadRequest`, `estimateBytes(options, formats, duration) -> number | null`, `isTrimmed(options, duration) -> boolean`, `AUDIO_BITRATES_KBPS`
  - `reducer.ts`: `initialState(preferences?) -> AppState`, `reducer(state, action) -> AppState`, `visibleItems(state) -> QueueItem[]`, `countItems(state) -> { all, active, done, error }`, `selectedItem(state) -> QueueItem | null`
  - `preferences.ts`: `DEFAULT_PREFERENCES`, `loadPersisted() -> { preferences, items, history }`, `savePreferences(p)`, `saveItems(items)`, `saveHistory(entries)`
  - `commands.ts`: `createCommands(dispatch, getState) -> Commands` with `fetchLinks(urls, scope)`, `startDownload(itemId)`, `startAllReady()`, `cancelJob(jobId)`, `retryJob(jobId)`, `retryFetch(itemId)`, `removeItem(itemId)`, `downloadAgain(entryId)`, `syncJobs()`, `loadServerState()`, `saveSettings(patch)`, `uploadCookies(file)`, `removeCookies()`, `signIn(password)`, `signOut()`, `notify(notice)`
  - `useJobPolling(sync, hasActiveJobs, enabled) -> void`
  - `StoreProvider({ children })`, `useStore() -> { state, dispatch, commands }`

- [ ] **Step 1: Define the state types**

`apps/web/src/state/types.ts`:

```ts
import type { AudioFormat, AudioQuality, Container, CookieSummary, DownloadKind, Job, MediaFormat, MediaInfo, RuntimeSettings, SessionInfo, StorageUsage, SubtitleMode, TrimRange } from "@/lib/api/types";
import type { LanguagePreference } from "@/lib/i18n/I18nProvider";
import type { PlatformId } from "@/lib/links";
import type { AccentId, ThemePreference } from "@/lib/theme";

export type Filter = "all" | "active" | "done" | "error";
export type View = "queue" | "history";
export type DefaultFormatId = "video-mp4-1080" | "video-mp4-720" | "audio-m4a" | "audio-mp3";
export type PlaylistScope = "single" | "playlist";

export interface DraftOptions {
  readonly kind: DownloadKind;
  readonly container: Container;
  readonly qualityHeight: number | null;
  readonly audioFormat: AudioFormat;
  readonly audioQuality: AudioQuality;
  readonly trim: TrimRange | null;
  readonly subtitleLanguages: readonly string[];
  readonly subtitleMode: SubtitleMode;
  readonly embedMetadata: boolean;
}

export interface MediaSnapshot {
  readonly url: string;
  readonly title: string;
  readonly thumbnail: string;
  readonly duration: number | null;
  readonly uploader: string;
  readonly platform: PlatformId;
}

export interface FetchingItem {
  readonly type: "fetching";
  readonly id: string;
  readonly url: string;
}

export interface FetchErrorItem {
  readonly type: "fetch-error";
  readonly id: string;
  readonly url: string;
  readonly code: string;
}

export interface ReadyItem {
  readonly type: "ready";
  readonly id: string;
  readonly media: MediaSnapshot;
  readonly formats: readonly MediaFormat[];
  readonly options: DraftOptions;
}

export interface JobItem {
  readonly type: "job";
  readonly id: string;
  readonly media: MediaSnapshot;
  readonly formats: readonly MediaFormat[];
  readonly options: DraftOptions;
  readonly job: Job;
}

export type QueueItem = FetchingItem | FetchErrorItem | ReadyItem | JobItem;

export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly kind: DownloadKind;
  readonly label: string;
  readonly sizeBytes: number;
  readonly finishedAt: string;
}

export interface Preferences {
  readonly theme: ThemePreference;
  readonly accent: AccentId;
  readonly language: LanguagePreference;
  readonly defaultFormat: DefaultFormatId;
  readonly installHintDismissed: boolean;
}

export interface Notice {
  readonly id: number;
  readonly tone: "success" | "info" | "error";
  readonly message: string;
  readonly detail?: string;
  readonly count?: number;
}

export interface AppState {
  readonly items: readonly QueueItem[];
  readonly selectedId: string | null;
  readonly view: View;
  readonly filter: Filter;
  readonly history: readonly HistoryEntry[];
  readonly session: SessionInfo | null;
  readonly settings: RuntimeSettings | null;
  readonly storage: StorageUsage | null;
  readonly cookies: CookieSummary | null;
  readonly preferences: Preferences;
  readonly notice: Notice | null;
}

export type Action = { readonly type: "fetch/started"; readonly id: string; readonly url: string } | { readonly type: "fetch/succeeded"; readonly id: string; readonly url: string; readonly info: MediaInfo } | { readonly type: "fetch/failed"; readonly id: string; readonly code: string } | { readonly type: "item/selected"; readonly id: string | null } | { readonly type: "item/optionsChanged"; readonly id: string; readonly patch: Partial<DraftOptions> } | { readonly type: "item/removed"; readonly id: string } | { readonly type: "download/started"; readonly itemId: string; readonly job: Job } | { readonly type: "job/cancelled"; readonly jobId: string } | { readonly type: "jobs/synced"; readonly jobs: readonly Job[] } | { readonly type: "history/cleared" } | { readonly type: "view/changed"; readonly view: View; readonly filter?: Filter } | { readonly type: "session/loaded"; readonly session: SessionInfo } | { readonly type: "settings/loaded"; readonly settings: RuntimeSettings } | { readonly type: "storage/loaded"; readonly storage: StorageUsage } | { readonly type: "cookies/loaded"; readonly cookies: CookieSummary } | { readonly type: "preferences/changed"; readonly patch: Partial<Preferences> } | { readonly type: "notice/shown"; readonly notice: Notice } | { readonly type: "notice/dismissed"; readonly id: number };
```

- [ ] **Step 2: Write the failing option tests**

`apps/web/src/state/options.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MediaFormat } from "@/lib/api/types";
import { defaultDraft, estimateBytes, isTrimmed, toDownloadRequest } from "./options";
import type { ReadyItem } from "./types";

const FORMATS: MediaFormat[] = [
  { id: "313", label: "2160p", height: 2160, ext: "webm", filesize: 1_600_000_000 },
  { id: "137", label: "1080p", height: 1080, ext: "mp4", filesize: 412_000_000 },
  { id: "136", label: "720p", height: 720, ext: "mp4", filesize: null },
];

function readyItem(overrides: Partial<ReadyItem["options"]> = {}): ReadyItem {
  return {
    type: "ready",
    id: "r1",
    media: { url: "https://youtu.be/a", title: "Pho", thumbnail: "", duration: 1122, uploader: "Bep", platform: "youtube" },
    formats: FORMATS,
    options: { ...defaultDraft("video-mp4-1080", FORMATS), ...overrides },
  };
}

describe("options", () => {
  it("picks the best height at or below the default", () => {
    expect(defaultDraft("video-mp4-1080", FORMATS).qualityHeight).toBe(1080);
    expect(defaultDraft("video-mp4-720", FORMATS).qualityHeight).toBe(720);
    expect(defaultDraft("video-mp4-1080", []).qualityHeight).toBeNull();
    expect(defaultDraft("audio-mp3", FORMATS)).toMatchObject({ kind: "audio", audioFormat: "mp3", audioQuality: "320k" });
  });

  it("builds a minimal video request", () => {
    expect(toDownloadRequest(readyItem())).toEqual({
      url: "https://youtu.be/a",
      title: "Pho",
      format: "video",
      container: "mp4",
      format_id: "137",
      quality_height: 1080,
      embed_metadata: true,
    });
  });

  it("includes trim and subtitles only when used", () => {
    const request = toDownloadRequest(readyItem({ trim: { start: 5, end: 65 }, subtitleLanguages: ["vi"], subtitleMode: "srt" }));
    expect(request.trim).toEqual({ start: 5, end: 65 });
    expect(request.subtitles).toEqual({ languages: ["vi"], mode: "srt" });
    expect(toDownloadRequest(readyItem({ trim: { start: 0, end: 1122 } })).trim).toBeUndefined();
  });

  it("builds an audio request", () => {
    expect(toDownloadRequest(readyItem({ kind: "audio", audioFormat: "flac", audioQuality: "best" }))).toEqual({
      url: "https://youtu.be/a",
      title: "Pho",
      format: "audio",
      audio_format: "flac",
      audio_quality: "best",
      embed_metadata: true,
    });
  });

  it("estimates sizes from formats, trim and bitrates", () => {
    const item = readyItem();
    expect(estimateBytes(item.options, FORMATS, 1122)).toBe(412_000_000);
    expect(estimateBytes({ ...item.options, trim: { start: 0, end: 561 } }, FORMATS, 1122)).toBe(206_000_000);
    expect(estimateBytes({ ...item.options, kind: "audio", audioFormat: "mp3", audioQuality: "320k" }, FORMATS, 60)).toBe(2_400_000);
    expect(estimateBytes({ ...item.options, qualityHeight: 720 }, FORMATS, null)).toBeNull();
  });

  it("knows when a range is trimmed", () => {
    expect(isTrimmed({ ...readyItem().options, trim: { start: 0, end: 1122 } }, 1122)).toBe(false);
    expect(isTrimmed({ ...readyItem().options, trim: { start: 3, end: 1122 } }, 1122)).toBe(true);
  });
});
```

- [ ] **Step 3: Implement options**

`apps/web/src/state/options.ts`:

```ts
import type { AudioFormat, AudioQuality, DownloadRequest, MediaFormat } from "@/lib/api/types";
import type { DefaultFormatId, DraftOptions, ReadyItem } from "./types";

const BITS_PER_BYTE = 8;
const BITS_PER_KILOBIT = 1000;

export const AUDIO_BITRATES_KBPS: Record<AudioFormat, Record<AudioQuality, number>> = {
  mp3: { "320k": 320, best: 245 },
  m4a: { "320k": 320, best: 160 },
  opus: { "320k": 320, best: 128 },
  flac: { "320k": 900, best: 900 },
  wav: { "320k": 1411, best: 1411 },
};

const DEFAULTS: Record<DefaultFormatId, Pick<DraftOptions, "kind" | "audioFormat" | "audioQuality"> & { maxHeight: number }> = {
  "video-mp4-1080": { kind: "video", audioFormat: "m4a", audioQuality: "best", maxHeight: 1080 },
  "video-mp4-720": { kind: "video", audioFormat: "m4a", audioQuality: "best", maxHeight: 720 },
  "audio-m4a": { kind: "audio", audioFormat: "m4a", audioQuality: "best", maxHeight: 1080 },
  "audio-mp3": { kind: "audio", audioFormat: "mp3", audioQuality: "320k", maxHeight: 1080 },
};

function bestHeightAtMost(formats: readonly MediaFormat[], maxHeight: number): number | null {
  const heights = formats.map((format) => format.height).filter((height) => height <= maxHeight);
  return heights.length > 0 ? Math.max(...heights) : (formats[formats.length - 1]?.height ?? null);
}

export function defaultDraft(defaultFormat: DefaultFormatId, formats: readonly MediaFormat[]): DraftOptions {
  const preset = DEFAULTS[defaultFormat];
  return {
    kind: preset.kind,
    container: "mp4",
    qualityHeight: bestHeightAtMost(formats, preset.maxHeight),
    audioFormat: preset.audioFormat,
    audioQuality: preset.audioQuality,
    trim: null,
    subtitleLanguages: [],
    subtitleMode: "embed",
    embedMetadata: true,
  };
}

export function isTrimmed(options: DraftOptions, duration: number | null): boolean {
  if (options.trim === null || duration === null) return false;
  return options.trim.start > 0 || options.trim.end < duration;
}

function videoFields(item: ReadyItem): Partial<DownloadRequest> {
  const { options, formats } = item;
  const format = formats.find((candidate) => candidate.height === options.qualityHeight);
  return {
    container: options.container,
    ...(format ? { format_id: format.id } : {}),
    ...(options.qualityHeight !== null ? { quality_height: options.qualityHeight } : {}),
    ...(options.subtitleLanguages.length > 0 ? { subtitles: { languages: options.subtitleLanguages, mode: options.subtitleMode } } : {}),
  };
}

export function toDownloadRequest(item: ReadyItem): DownloadRequest {
  const { options, media } = item;
  const kindFields = options.kind === "video" ? videoFields(item) : { audio_format: options.audioFormat, audio_quality: options.audioQuality };
  return {
    url: media.url,
    title: media.title,
    format: options.kind,
    ...kindFields,
    ...(isTrimmed(options, media.duration) && options.trim ? { trim: options.trim } : {}),
    embed_metadata: options.embedMetadata,
  };
}

function selectedSeconds(options: DraftOptions, duration: number): number {
  return options.trim ? Math.max(options.trim.end - options.trim.start, 0) : duration;
}

export function estimateBytes(options: DraftOptions, formats: readonly MediaFormat[], duration: number | null): number | null {
  if (duration === null || duration <= 0) return null;
  const seconds = selectedSeconds(options, duration);
  if (options.kind === "audio") {
    const kbps = AUDIO_BITRATES_KBPS[options.audioFormat][options.audioQuality];
    return Math.round((kbps * BITS_PER_KILOBIT * seconds) / BITS_PER_BYTE);
  }
  const format = formats.find((candidate) => candidate.height === options.qualityHeight);
  return format?.filesize ? Math.round((format.filesize * seconds) / duration) : null;
}
```

- [ ] **Step 4: Write the failing reducer tests**

`apps/web/src/state/reducer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Job, MediaInfo } from "@/lib/api/types";
import { countItems, initialState, reducer, visibleItems } from "./reducer";
import type { AppState } from "./types";

const INFO: MediaInfo = {
  id: "a",
  title: "Pho",
  thumbnail: "https://i.ytimg.com/a.jpg",
  duration: 1122,
  uploader: "Bep",
  platform: "Youtube",
  webpage_url: "https://youtu.be/a",
  formats: [{ id: "137", label: "1080p", height: 1080, ext: "mp4", filesize: 412_000_000 }],
  subtitle_languages: [],
  has_chapters: false,
};

function job(overrides: Partial<Job> = {}): Job {
  return {
    job_id: "j1",
    url: "https://youtu.be/a",
    title: "Pho",
    status: "downloading",
    progress: 40,
    speed_bps: 1,
    eta_seconds: 9,
    downloaded_bytes: 1,
    total_bytes: 2,
    queue_position: 0,
    options: { kind: "video", container: "mp4", quality_height: 1080, format_id: "137", audio_format: null, audio_quality: null, trim: null, subtitles: null, embed_metadata: true },
    filename: null,
    files: [],
    error: null,
    error_code: null,
    created_at: "2026-09-14T08:00:00Z",
    finished_at: null,
    expires_at: null,
    ...overrides,
  };
}

function withReadyItem(): AppState {
  const fetching = reducer(initialState(), { type: "fetch/started", id: "r1", url: "https://youtu.be/a" });
  return reducer(fetching, { type: "fetch/succeeded", id: "r1", url: "https://youtu.be/a", info: INFO });
}

describe("reducer", () => {
  it("turns a fetched link into a selected ready item with default options", () => {
    const state = withReadyItem();
    expect(state.items[0]).toMatchObject({ type: "ready", id: "r1", media: { title: "Pho", platform: "youtube" }, options: { qualityHeight: 1080 } });
    expect(state.selectedId).toBe("r1");
  });

  it("records fetch failures", () => {
    const state = reducer(reducer(initialState(), { type: "fetch/started", id: "x", url: "https://x.y/z" }), { type: "fetch/failed", id: "x", code: "unsupported_url" });
    expect(state.items[0]).toEqual({ type: "fetch-error", id: "x", url: "https://x.y/z", code: "unsupported_url" });
  });

  it("changes options on a ready item", () => {
    const state = reducer(withReadyItem(), { type: "item/optionsChanged", id: "r1", patch: { kind: "audio" } });
    expect(state.items[0]).toMatchObject({ options: { kind: "audio" } });
  });

  it("links a started download and follows server updates into history", () => {
    const started = reducer(withReadyItem(), { type: "download/started", itemId: "r1", job: job() });
    expect(started.items[0]).toMatchObject({ type: "job", id: "j1" });
    expect(started.selectedId).toBe("j1");
    const done = reducer(started, {
      type: "jobs/synced",
      jobs: [job({ status: "done", progress: 100, files: [{ index: 0, name: "Pho.mp4", kind: "media", size_bytes: 412 }], finished_at: "2026-09-14T08:05:00Z" })],
    });
    expect(done.items[0]).toMatchObject({ job: { status: "done" } });
    expect(done.history).toEqual([{ id: "j1", url: "https://youtu.be/a", title: "Pho", kind: "video", label: "MP4 1080p", sizeBytes: 412, finishedAt: "2026-09-14T08:05:00Z" }]);
    const again = reducer(done, { type: "jobs/synced", jobs: [job({ status: "done", finished_at: "2026-09-14T08:05:00Z" })] });
    expect(again.history).toHaveLength(1);
  });

  it("adopts server jobs it did not start and drops jobs the server forgot", () => {
    const adopted = reducer(initialState(), { type: "jobs/synced", jobs: [job({ job_id: "remote", status: "queued" })] });
    expect(adopted.items[0]).toMatchObject({ type: "job", id: "remote", media: { title: "Pho", platform: "youtube" } });
    expect(reducer(adopted, { type: "jobs/synced", jobs: [] }).items).toEqual([]);
  });

  it("ignores cancelled jobs from the server", () => {
    expect(reducer(initialState(), { type: "jobs/synced", jobs: [job({ status: "cancelled" })] }).items).toEqual([]);
  });

  it("returns a cancelled job to a ready item", () => {
    const started = reducer(withReadyItem(), { type: "download/started", itemId: "r1", job: job() });
    const cancelled = reducer(started, { type: "job/cancelled", jobId: "j1" });
    expect(cancelled.items[0]).toMatchObject({ type: "ready", id: "j1", options: { qualityHeight: 1080 } });
  });

  it("filters and counts", () => {
    const started = reducer(withReadyItem(), { type: "download/started", itemId: "r1", job: job() });
    const withError = reducer(started, { type: "fetch/started", id: "e", url: "https://x.y" });
    const failed = reducer(withError, { type: "fetch/failed", id: "e", code: "unavailable" });
    expect(countItems(failed)).toEqual({ all: 2, active: 1, done: 0, error: 1 });
    const filtered = reducer(failed, { type: "view/changed", view: "queue", filter: "error" });
    expect(visibleItems(filtered).map((item) => item.id)).toEqual(["e"]);
  });

  it("clears history and shows notices", () => {
    const noticed = reducer(initialState(), { type: "notice/shown", notice: { id: 7, tone: "info", message: "hi" } });
    expect(noticed.notice?.id).toBe(7);
    expect(reducer(noticed, { type: "notice/dismissed", id: 7 }).notice).toBeNull();
  });
});
```

- [ ] **Step 5: Implement the reducer**

`apps/web/src/state/reducer.ts`:

```ts
import type { Job, MediaInfo } from "@/lib/api/types";
import { detectPlatform } from "@/lib/links";
import { defaultDraft } from "./options";
import type { Action, AppState, DraftOptions, Filter, HistoryEntry, JobItem, MediaSnapshot, Preferences, QueueItem } from "./types";

export const MAX_HISTORY_ENTRIES = 200;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  accent: "teal",
  language: "auto",
  defaultFormat: "video-mp4-1080",
  installHintDismissed: false,
};

const ACTIVE_STATUSES = new Set(["queued", "downloading", "processing"]);

export function initialState(preferences: Preferences = DEFAULT_PREFERENCES): AppState {
  return { items: [], selectedId: null, view: "queue", filter: "all", history: [], session: null, settings: null, storage: null, cookies: null, preferences, notice: null };
}

function snapshotFromInfo(url: string, info: MediaInfo): MediaSnapshot {
  return { url, title: info.title || url, thumbnail: info.thumbnail, duration: info.duration, uploader: info.uploader, platform: detectPlatform(url) };
}

function snapshotFromJob(job: Job): MediaSnapshot {
  return { url: job.url, title: job.title || job.url, thumbnail: "", duration: null, uploader: "", platform: detectPlatform(job.url) };
}

function draftFromJob(job: Job): DraftOptions {
  const { options } = job;
  return {
    kind: options.kind,
    container: options.container,
    qualityHeight: options.quality_height,
    audioFormat: options.audio_format ?? "m4a",
    audioQuality: options.audio_quality ?? "best",
    trim: options.trim,
    subtitleLanguages: options.subtitles?.languages ?? [],
    subtitleMode: options.subtitles?.mode ?? "embed",
    embedMetadata: options.embed_metadata,
  };
}

function jobLabel(job: Job): string {
  const { options } = job;
  if (options.kind === "audio") return (options.audio_format ?? "mp3").toUpperCase();
  return `${options.container.toUpperCase()}${options.quality_height ? ` ${options.quality_height}p` : ""}`;
}

function historyEntry(job: Job): HistoryEntry {
  return {
    id: job.job_id,
    url: job.url,
    title: job.title || job.url,
    kind: job.options.kind,
    label: jobLabel(job),
    sizeBytes: job.files[0]?.size_bytes ?? 0,
    finishedAt: job.finished_at ?? job.created_at,
  };
}

function replaceItem(items: readonly QueueItem[], id: string, next: QueueItem): QueueItem[] {
  return items.map((item) => (item.id === id ? next : item));
}

function mergeJob(existing: JobItem | undefined, job: Job): JobItem {
  if (existing) return { ...existing, job };
  return { type: "job", id: job.job_id, media: snapshotFromJob(job), formats: [], options: draftFromJob(job), job };
}

function syncJobs(state: AppState, jobs: readonly Job[]): AppState {
  const liveJobs = jobs.filter((job) => job.status !== "cancelled");
  const jobIds = new Set(liveJobs.map((job) => job.job_id));
  const existingJobs = new Map(state.items.filter((item): item is JobItem => item.type === "job").map((item) => [item.id, item]));
  const kept = state.items.filter((item) => item.type !== "job" || jobIds.has(item.id));
  const known = new Set(kept.map((item) => item.id));
  const adopted = liveJobs.filter((job) => !known.has(job.job_id)).map((job) => mergeJob(undefined, job));
  const liveById = new Map(liveJobs.map((job) => [job.job_id, job]));
  const merged = kept.map((item) => {
    const live = item.type === "job" ? liveById.get(item.id) : undefined;
    return item.type === "job" && live ? mergeJob(existingJobs.get(item.id), live) : item;
  });
  const newlyDone = liveJobs.filter((job) => job.status === "done" && !state.history.some((entry) => entry.id === job.job_id));
  const history = [...newlyDone.map(historyEntry), ...state.history].slice(0, MAX_HISTORY_ENTRIES);
  return { ...state, items: [...adopted, ...merged], history };
}

function startDownload(state: AppState, itemId: string, job: Job): AppState {
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item || item.type !== "ready") return state;
  const next: JobItem = { type: "job", id: job.job_id, media: item.media, formats: item.formats, options: item.options, job };
  return { ...state, items: replaceItem(state.items, itemId, next), selectedId: state.selectedId === itemId ? job.job_id : state.selectedId };
}

function cancelJob(state: AppState, jobId: string): AppState {
  const item = state.items.find((candidate) => candidate.id === jobId);
  if (!item || item.type !== "job") return state;
  return { ...state, items: replaceItem(state.items, jobId, { type: "ready", id: item.id, media: item.media, formats: item.formats, options: item.options }) };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "fetch/started":
      return { ...state, items: [{ type: "fetching", id: action.id, url: action.url }, ...state.items] };
    case "fetch/succeeded": {
      const ready: QueueItem = { type: "ready", id: action.id, media: snapshotFromInfo(action.url, action.info), formats: action.info.formats, options: defaultDraft(state.preferences.defaultFormat, action.info.formats) };
      return { ...state, items: replaceItem(state.items, action.id, ready), selectedId: action.id };
    }
    case "fetch/failed": {
      const item = state.items.find((candidate) => candidate.id === action.id);
      return item ? { ...state, items: replaceItem(state.items, action.id, { type: "fetch-error", id: action.id, url: item.type === "fetching" ? item.url : "", code: action.code }) } : state;
    }
    case "item/selected":
      return { ...state, selectedId: action.id };
    case "item/optionsChanged":
      return { ...state, items: state.items.map((item) => (item.id === action.id && item.type === "ready" ? { ...item, options: { ...item.options, ...action.patch } } : item)) };
    case "item/removed":
      return { ...state, items: state.items.filter((item) => item.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId };
    case "download/started":
      return startDownload(state, action.itemId, action.job);
    case "job/cancelled":
      return cancelJob(state, action.jobId);
    case "jobs/synced":
      return syncJobs(state, action.jobs);
    case "history/cleared":
      return { ...state, history: [] };
    case "view/changed":
      return { ...state, view: action.view, filter: action.filter ?? state.filter };
    case "session/loaded":
      return { ...state, session: action.session };
    case "settings/loaded":
      return { ...state, settings: action.settings };
    case "storage/loaded":
      return { ...state, storage: action.storage };
    case "cookies/loaded":
      return { ...state, cookies: action.cookies };
    case "preferences/changed":
      return { ...state, preferences: { ...state.preferences, ...action.patch } };
    case "notice/shown":
      return { ...state, notice: action.notice };
    case "notice/dismissed":
      return state.notice?.id === action.id ? { ...state, notice: null } : state;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

const FILTERS: Record<Filter, (item: QueueItem) => boolean> = {
  all: () => true,
  active: (item) => item.type === "fetching" || (item.type === "job" && ACTIVE_STATUSES.has(item.job.status)),
  done: (item) => item.type === "job" && item.job.status === "done",
  error: (item) => item.type === "fetch-error" || (item.type === "job" && item.job.status === "error"),
};

export function visibleItems(state: AppState): QueueItem[] {
  return state.items.filter(FILTERS[state.filter]);
}

export function countItems(state: AppState): Record<Filter, number> {
  const settled = state.items.filter((item) => item.type !== "fetching");
  return {
    all: settled.length,
    active: settled.filter(FILTERS.active).length,
    done: settled.filter(FILTERS.done).length,
    error: settled.filter(FILTERS.error).length,
  };
}

export function selectedItem(state: AppState): QueueItem | null {
  return state.items.find((item) => item.id === state.selectedId) ?? null;
}
```

`DEFAULT_PREFERENCES` lives here and is re-exported by `lib/preferences.ts`.

- [ ] **Step 6: Write the failing persistence tests and implement persistence**

`apps/web/src/lib/preferences.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, loadPersisted, saveHistory, saveItems, savePreferences } from "./preferences";

describe("preferences", () => {
  it("returns defaults when nothing is stored or storage is corrupt", () => {
    expect(loadPersisted().preferences).toEqual(DEFAULT_PREFERENCES);
    window.localStorage.setItem("openmedia.preferences", "{broken");
    expect(loadPersisted().preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it("round-trips preferences, ready items and history while dropping transient items", () => {
    savePreferences({ ...DEFAULT_PREFERENCES, accent: "pink", theme: "dark" });
    saveItems([
      { type: "fetching", id: "f", url: "https://a.b" },
      { type: "ready", id: "r", media: { url: "https://a.b", title: "A", thumbnail: "", duration: 10, uploader: "", platform: "other" }, formats: [], options: { kind: "video", container: "mp4", qualityHeight: null, audioFormat: "m4a", audioQuality: "best", trim: null, subtitleLanguages: [], subtitleMode: "embed", embedMetadata: true } },
    ]);
    saveHistory([{ id: "h", url: "https://a.b", title: "A", kind: "audio", label: "MP3", sizeBytes: 1, finishedAt: "2026-09-14T00:00:00Z" }]);
    const restored = loadPersisted();
    expect(restored.preferences.accent).toBe("pink");
    expect(restored.items.map((item) => item.id)).toEqual(["r"]);
    expect(restored.history).toHaveLength(1);
  });
});
```

`apps/web/src/lib/preferences.ts`:

```ts
import { DEFAULT_PREFERENCES } from "@/state/reducer";
import type { HistoryEntry, Preferences, QueueItem } from "@/state/types";
import { PREFERENCES_STORAGE_KEY } from "./theme";

export { DEFAULT_PREFERENCES };

const ITEMS_STORAGE_KEY = "openmedia.queue";
const HISTORY_STORAGE_KEY = "openmedia.history";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPersisted(): { preferences: Preferences; items: QueueItem[]; history: HistoryEntry[] } {
  const stored = read<Partial<Preferences>>(PREFERENCES_STORAGE_KEY, {});
  return {
    preferences: { ...DEFAULT_PREFERENCES, ...(typeof stored === "object" && stored !== null ? stored : {}) },
    items: read<QueueItem[]>(ITEMS_STORAGE_KEY, []).filter((item) => item.type === "ready" || item.type === "job"),
    history: read<HistoryEntry[]>(HISTORY_STORAGE_KEY, []),
  };
}

export function savePreferences(preferences: Preferences): boolean {
  return write(PREFERENCES_STORAGE_KEY, preferences);
}

export function saveItems(items: readonly QueueItem[]): boolean {
  return write(
    ITEMS_STORAGE_KEY,
    items.filter((item) => item.type === "ready" || item.type === "job"),
  );
}

export function saveHistory(history: readonly HistoryEntry[]): boolean {
  return write(HISTORY_STORAGE_KEY, history);
}
```

- [ ] **Step 7: Write the failing command tests**

`apps/web/src/state/commands.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "@/lib/api/client";
import { createCommands } from "./commands";
import { initialState, reducer } from "./reducer";
import type { Action, AppState } from "./types";

function harness(): { commands: ReturnType<typeof createCommands>; state: () => AppState } {
  let state = initialState();
  const dispatch = (action: Action): void => {
    state = reducer(state, action);
  };
  return { commands: createCommands(dispatch, () => state), state: () => state };
}

const INFO = { id: "a", title: "Pho", thumbnail: "", duration: 60, uploader: "", platform: "Youtube", webpage_url: "", formats: [], subtitle_languages: [], has_chapters: false };

describe("commands", () => {
  it("fetches each link and records failures with their codes", async () => {
    vi.spyOn(api, "info").mockImplementation(async (url) => {
      if (url.includes("bad")) throw new ApiRequestError(400, "unsupported_url", "no", null);
      return INFO;
    });
    const { commands, state } = harness();
    await commands.fetchLinks(["https://youtu.be/a", "https://bad.example/x"], "single");
    expect(
      state()
        .items.map((item) => item.type)
        .sort(),
    ).toEqual(["fetch-error", "ready"]);
  });

  it("expands playlists before fetching", async () => {
    vi.spyOn(api, "playlist").mockResolvedValue({ title: "Mix", count: 2, urls: ["https://youtu.be/1", "https://youtu.be/2"] });
    const info = vi.spyOn(api, "info").mockResolvedValue(INFO);
    const { commands } = harness();
    await commands.fetchLinks(["https://www.youtube.com/watch?v=a&list=PL1"], "playlist");
    expect(info).toHaveBeenCalledTimes(2);
  });

  it("starts a download and cancels it back to ready", async () => {
    vi.spyOn(api, "info").mockResolvedValue(INFO);
    const job = { job_id: "j1", url: "https://youtu.be/a", title: "Pho", status: "queued", progress: 0, speed_bps: null, eta_seconds: null, downloaded_bytes: null, total_bytes: null, queue_position: 1, options: { kind: "video", container: "mp4", quality_height: null, format_id: null, audio_format: null, audio_quality: null, trim: null, subtitles: null, embed_metadata: true }, filename: null, files: [], error: null, error_code: null, created_at: "2026-09-14T00:00:00Z", finished_at: null, expires_at: null } as const;
    vi.spyOn(api, "download").mockResolvedValue({ job_id: "j1", job });
    const remove = vi.spyOn(api, "removeJob").mockResolvedValue(undefined);
    const { commands, state } = harness();
    await commands.fetchLinks(["https://youtu.be/a"], "single");
    await commands.startDownload(state().items[0].id);
    expect(state().items[0]).toMatchObject({ type: "job", id: "j1" });
    await commands.cancelJob("j1");
    expect(remove).toHaveBeenCalledWith("j1");
    expect(state().items[0].type).toBe("ready");
  });

  it("shows a localized notice code when the API fails", async () => {
    vi.spyOn(api, "updateSettings").mockRejectedValue(new ApiRequestError(400, "invalid_option", "bad", null));
    const { commands, state } = harness();
    await commands.saveSettings({ max_concurrent: 9 });
    expect(state().notice).toMatchObject({ tone: "error", message: "invalid_option" });
  });
});
```

Notices never hold translated text: an error notice's `message` is an API error code resolved through `t.errors`, and a success or info notice's `message` is a key of `t.island` (for example `"fetched"`), with optional `detail` and `count` for the message function.

- [ ] **Step 8: Implement commands, polling and the provider**

`apps/web/src/state/commands.ts`:

```ts
import { api, ApiRequestError } from "@/lib/api/client";
import type { RuntimeSettings } from "@/lib/api/types";
import { hasPlaylist } from "@/lib/links";
import { toDownloadRequest } from "./options";
import type { Action, AppState, Notice, PlaylistScope } from "./types";

type Dispatch = (action: Action) => void;
type NoticeInput = Omit<Notice, "id">;

export interface Commands {
  notify(notice: NoticeInput): void;
  fetchLinks(urls: readonly string[], scope: PlaylistScope): Promise<void>;
  startDownload(itemId: string): Promise<void>;
  startAllReady(): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
  retryFetch(itemId: string): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  downloadAgain(entryId: string): Promise<void>;
  syncJobs(): Promise<void>;
  loadServerState(): Promise<void>;
  saveSettings(patch: Partial<RuntimeSettings>): Promise<void>;
  uploadCookies(file: File): Promise<void>;
  removeCookies(): Promise<void>;
  signIn(password: string): Promise<boolean>;
  signOut(): Promise<void>;
}

let noticeSequence = 0;
let itemSequence = 0;

const nextItemId = (): string => `item-${Date.now().toString(36)}-${(itemSequence += 1)}`;

function errorCode(error: unknown): string {
  return error instanceof ApiRequestError ? error.code : "unknown_error";
}

export function createCommands(dispatch: Dispatch, getState: () => AppState): Commands {
  const notify = (notice: NoticeInput): void => dispatch({ type: "notice/shown", notice: { ...notice, id: (noticeSequence += 1) } });
  const fail = (error: unknown): void => notify({ tone: "error", message: errorCode(error) });
  const guarded = async (work: () => Promise<void>): Promise<void> => {
    try {
      await work();
    } catch (error) {
      fail(error);
    }
  };

  const fetchOne = async (url: string): Promise<void> => {
    const id = nextItemId();
    dispatch({ type: "fetch/started", id, url });
    try {
      dispatch({ type: "fetch/succeeded", id, url, info: await api.info(url) });
    } catch (error) {
      dispatch({ type: "fetch/failed", id, code: errorCode(error) });
    }
  };

  const expand = async (urls: readonly string[], scope: PlaylistScope): Promise<string[]> => {
    const expanded = await Promise.all(urls.map(async (url) => (scope === "playlist" && hasPlaylist(url) ? [...(await api.playlist(url)).urls] : [url])));
    return expanded.flat();
  };

  const syncJobs = async (): Promise<void> => {
    dispatch({ type: "jobs/synced", jobs: await api.jobs() });
  };

  const startDownload = async (itemId: string): Promise<void> =>
    guarded(async () => {
      const item = getState().items.find((candidate) => candidate.id === itemId);
      if (!item || item.type !== "ready") return;
      const { job } = await api.download(toDownloadRequest(item));
      dispatch({ type: "download/started", itemId, job });
    });

  return {
    notify,
    syncJobs: () => guarded(syncJobs),
    fetchLinks: (urls, scope) =>
      guarded(async () => {
        const targets = await expand(urls, scope);
        await Promise.all(targets.map(fetchOne));
        const ready = getState().items.filter((item) => item.type === "ready").length;
        if (ready > 0) notify({ tone: "success", message: targets.length > urls.length ? "playlistAdded" : "fetched", count: targets.length });
      }),
    startDownload,
    startAllReady: async () => {
      const readyIds = getState()
        .items.filter((item) => item.type === "ready")
        .map((item) => item.id);
      for (const id of readyIds) await startDownload(id);
    },
    cancelJob: (jobId) =>
      guarded(async () => {
        await api.removeJob(jobId);
        dispatch({ type: "job/cancelled", jobId });
        notify({ tone: "info", message: "cancelled" });
      }),
    retryJob: (jobId) =>
      guarded(async () => {
        await api.removeJob(jobId);
        dispatch({ type: "job/cancelled", jobId });
        await startDownload(jobId);
      }),
    retryFetch: (itemId) =>
      guarded(async () => {
        const item = getState().items.find((candidate) => candidate.id === itemId);
        if (!item || item.type !== "fetch-error") return;
        dispatch({ type: "item/removed", id: itemId });
        await fetchOne(item.url);
      }),
    removeItem: (itemId) =>
      guarded(async () => {
        const item = getState().items.find((candidate) => candidate.id === itemId);
        if (item?.type === "job") await api.removeJob(itemId);
        dispatch({ type: "item/removed", id: itemId });
      }),
    downloadAgain: (entryId) =>
      guarded(async () => {
        const entry = getState().history.find((candidate) => candidate.id === entryId);
        if (!entry) return;
        dispatch({ type: "view/changed", view: "queue", filter: "all" });
        await fetchOne(entry.url);
        notify({ tone: "success", message: "addedAgain" });
      }),
    loadServerState: () =>
      guarded(async () => {
        const session = await api.session();
        dispatch({ type: "session/loaded", session });
        if (session.auth_required && !session.authenticated) return;
        const [settings, storage, cookies] = await Promise.all([api.settings(), api.storage(), api.cookies()]);
        dispatch({ type: "settings/loaded", settings });
        dispatch({ type: "storage/loaded", storage });
        dispatch({ type: "cookies/loaded", cookies });
        await syncJobs();
      }),
    saveSettings: (patch) =>
      guarded(async () => {
        dispatch({ type: "settings/loaded", settings: await api.updateSettings(patch) });
      }),
    uploadCookies: (file) =>
      guarded(async () => {
        dispatch({ type: "cookies/loaded", cookies: await api.uploadCookies(file) });
        notify({ tone: "success", message: "cookiesLoaded" });
      }),
    removeCookies: () =>
      guarded(async () => {
        await api.removeCookies();
        dispatch({ type: "cookies/loaded", cookies: { present: false, domains: [], expires_at: null, uploaded_at: null } });
        notify({ tone: "info", message: "cookiesRemoved" });
      }),
    signIn: async (password) => {
      try {
        await api.signIn(password);
        dispatch({ type: "session/loaded", session: await api.session() });
        return true;
      } catch (error) {
        if (errorCode(error) !== "invalid_password") fail(error);
        return false;
      }
    },
    signOut: () =>
      guarded(async () => {
        await api.signOut();
        dispatch({ type: "session/loaded", session: await api.session() });
      }),
  };
}
```

`apps/web/src/state/useJobPolling.ts`:

```ts
"use client";

import { useEffect } from "react";

const ACTIVE_INTERVAL_MS = 1000;
const IDLE_INTERVAL_MS = 10000;

export function useJobPolling(sync: () => Promise<void>, hasActiveJobs: boolean, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const interval = hasActiveJobs ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    const tick = (): void => {
      if (document.visibilityState === "visible") void sync();
    };
    const timer = window.setInterval(tick, interval);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [sync, hasActiveJobs, enabled]);
}
```

`apps/web/src/state/StoreProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { I18nProvider, resolveLocale } from "@/lib/i18n/I18nProvider";
import { loadPersisted, saveHistory, saveItems, savePreferences } from "@/lib/preferences";
import { applyAccent, applyTheme } from "@/lib/theme";
import { createCommands, type Commands } from "./commands";
import { initialState, reducer } from "./reducer";
import type { Action, AppState } from "./types";
import { useJobPolling } from "./useJobPolling";

interface StoreValue {
  readonly state: AppState;
  readonly dispatch: Dispatch<Action>;
  readonly commands: Commands;
}

const StoreContext = createContext<StoreValue | null>(null);
const ACTIVE_STATUSES = new Set(["queued", "downloading", "processing"]);

function createInitialState(): AppState {
  const persisted = loadPersisted();
  return { ...initialState(persisted.preferences), items: persisted.items, history: persisted.history };
}

export function StoreProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const stateRef = useRef(state);
  const commands = useMemo(() => createCommands(dispatch, () => stateRef.current), []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    void commands.loadServerState();
  }, [commands]);

  useEffect(() => {
    savePreferences(state.preferences);
    applyTheme(state.preferences.theme);
    applyAccent(state.preferences.accent);
  }, [state.preferences]);

  useEffect(() => {
    saveItems(state.items);
  }, [state.items]);

  useEffect(() => {
    saveHistory(state.history);
  }, [state.history]);

  const hasActiveJobs = state.items.some((item) => item.type === "job" && ACTIVE_STATUSES.has(item.job.status));
  const canPoll = state.session !== null && (!state.session.auth_required || state.session.authenticated);
  useJobPolling(commands.syncJobs, hasActiveJobs, canPoll);

  const locale = resolveLocale(state.preferences.language, typeof navigator === "undefined" ? "en" : navigator.language);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ state, dispatch, commands }), [state, commands]);
  return (
    <StoreContext.Provider value={value}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (value === null) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
```

`StoreProvider` reads localStorage in its initializer, so it must only render in the browser: Task 10 mounts the application through `next/dynamic` with `ssr: false`.

- [ ] **Step 9: Run the web checks**

Run from the project root: `mise run //apps/web:ci-unit`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat(web): add client state, persistence, API commands and job polling"
```

### Task 10: Controls, overlays, application shell and importer

**Files:**

- Create in `apps/web/src/components/controls/`: `Icon.tsx`, `Capsule.tsx`, `IconButton.tsx`, `Segmented.tsx`, `Segmented.test.tsx`, `Switch.tsx`, `Stepper.tsx`, `BrandMark.tsx`, `controls.module.css`
- Create in `apps/web/src/components/overlays/`: `Sheet.tsx`, `Sheet.test.tsx`, `AlertDialog.tsx`, `Island.tsx`, `ShortcutsHud.tsx`, `DropOverlay.tsx`, `overlays.module.css`
- Create in `apps/web/src/hooks/`: `useMediaQuery.ts`, `useFocusTrap.ts`
- Create in `apps/web/src/components/shell/`: `AppShell.tsx`, `Sidebar.tsx`, `Toolbar.tsx`, `TabBar.tsx`, `shell.module.css`
- Create in `apps/web/src/components/importer/`: `Importer.tsx`, `Importer.test.tsx`, `importer.module.css`
- Create: `apps/web/src/app/OpenMediaClient.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**

- Consumes: `useStore`, `useI18n`, `Commands`, `countItems`, `parseLinks`, `detectPlatforms`, `hasPlaylist`, `linkFromShare`, `PlaylistScope`.
- Produces:
  - `Icon({ name: IconName; size?: number; weight?: "regular" | "fill" | "bold" })`, `IconName` union listed in Step 1
  - `Capsule(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gray" | "primary" | "tinted" | "plain" | "destructive"; size?: "regular" | "large"; icon?: IconName })`
  - `IconButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName; size?: "small" | "regular" })`
  - `Segmented<T extends string>({ label, options: ReadonlyArray<{ value: T; label: string; icon?: IconName }>, value: T, onChange: (value: T) => void })`
  - `Switch({ checked, onChange, labelledBy })`, `Stepper({ value, min, max, onChange, decreaseLabel, increaseLabel })`, `BrandMark({ size })`
  - `useMediaQuery(query: string) -> boolean`, `PHONE_QUERY = "(max-width: 767px)"`, `TABLET_QUERY = "(max-width: 1023px)"`, `useFocusTrap(ref, active)`
  - `Sheet({ open, onClose, title, children, footer?, labelledById })` (modal from 768 px, draggable bottom sheet below), `AlertDialog({ open, title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel })`, `Island()`, `ShortcutsHud({ open, onClose })`, `DropOverlay({ onDrop: (text: string) => void })`
  - `AppShell()` (owns UI state: link text, playlist scope, sidebar, settings, shortcuts, alert), `Importer({ value, onChange, onSubmit, scope, onScopeChange, inputRef })`

- [ ] **Step 1: Icons and simple controls**

`apps/web/src/components/controls/Icon.tsx`:

```tsx
import { ArrowClockwise, ArrowDown, Check, CheckCircle, ClipboardText, ClockCounterClockwise, Cookie, DeviceMobile, DownloadSimple, FacebookLogo, FilmStrip, GearSix, Globe, InstagramLogo, Keyboard, Link, List, Lock, Minus, Moon, MusicNotes, Plus, Queue, SignOut, SoundcloudLogo, Sun, TiktokLogo, Timer, Trash, VideoCamera, VimeoLogo, WarningCircle, X, XLogo, YoutubeLogo, CaretRight, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const ICONS = {
  arrowClockwise: ArrowClockwise,
  arrowDown: ArrowDown,
  caretRight: CaretRight,
  check: Check,
  checkCircle: CheckCircle,
  clipboard: ClipboardText,
  history: ClockCounterClockwise,
  cookie: Cookie,
  deviceMobile: DeviceMobile,
  download: DownloadSimple,
  facebook: FacebookLogo,
  filmStrip: FilmStrip,
  gear: GearSix,
  globe: Globe,
  instagram: InstagramLogo,
  keyboard: Keyboard,
  link: Link,
  list: List,
  lock: Lock,
  minus: Minus,
  moon: Moon,
  musicNotes: MusicNotes,
  plus: Plus,
  queue: Queue,
  signOut: SignOut,
  soundcloud: SoundcloudLogo,
  sun: Sun,
  tiktok: TiktokLogo,
  timer: Timer,
  trash: Trash,
  videoCamera: VideoCamera,
  vimeo: VimeoLogo,
  warningCircle: WarningCircle,
  x: X,
  xLogo: XLogo,
  youtube: YoutubeLogo,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, weight = "regular" }: { name: IconName; size?: number; weight?: "regular" | "fill" | "bold" }): ReactNode {
  const Component = ICONS[name];
  return <Component size={size} weight={weight} aria-hidden="true" focusable="false" />;
}
```

If the Phosphor package exports `SSR` variants only for server components, import from `@phosphor-icons/react/dist/ssr` in files without `"use client"`; every component in this task is used inside the client tree, so the default entry works.

`apps/web/src/components/controls/Capsule.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon, type IconName } from "./Icon";

type CapsuleVariant = "gray" | "primary" | "tinted" | "plain" | "destructive";

interface CapsuleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CapsuleVariant;
  size?: "regular" | "large";
  icon?: IconName;
}

export function Capsule({ variant = "gray", size = "regular", icon, className, children, type = "button", ...rest }: CapsuleProps): ReactNode {
  const classes = [styles.capsule, styles[variant], size === "large" ? styles.large : "", className ?? ""].join(" ").trim();
  return (
    <button type={type} className={classes} {...rest}>
      {icon ? <Icon name={icon} size={size === "large" ? 18 : 16} /> : null}
      {children}
    </button>
  );
}
```

`IconButton.tsx`, `Switch.tsx`, `Stepper.tsx` and `BrandMark.tsx` follow the same pattern:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon, type IconName } from "./Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: IconName;
  size?: "small" | "regular";
}

export function IconButton({ label, icon, size = "regular", className, type = "button", ...rest }: IconButtonProps): ReactNode {
  return (
    <button type={type} aria-label={label} title={label} className={`${styles.iconButton} ${size === "small" ? styles.small : ""} ${className ?? ""}`} {...rest}>
      <Icon name={icon} size={size === "small" ? 14 : 18} />
    </button>
  );
}
```

```tsx
import type { ReactNode } from "react";
import styles from "./controls.module.css";

export function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (checked: boolean) => void; labelledBy: string }): ReactNode {
  return <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} className={styles.switch} onClick={() => onChange(!checked)} />;
}
```

```tsx
import type { ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon } from "./Icon";

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}

export function Stepper({ value, min, max, onChange, decreaseLabel, increaseLabel }: StepperProps): ReactNode {
  return (
    <span className={styles.stepperGroup}>
      <output className={styles.stepperValue} aria-live="polite">
        {value}
      </output>
      <span className={styles.stepper}>
        <button type="button" aria-label={decreaseLabel} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Icon name="minus" size={14} />
        </button>
        <span className={styles.stepperDivider} aria-hidden="true" />
        <button type="button" aria-label={increaseLabel} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Icon name="plus" size={14} />
        </button>
      </span>
    </span>
  );
}
```

```tsx
import type { ReactNode } from "react";
import styles from "./controls.module.css";

export const LOGO_FRAME_PATH = "M9 22 V9 H22 M42 9 H55 V22 M55 42 V55 H42 M22 55 H9 V42";
export const LOGO_WAVE_PATH = "M23 27 V37 M32 20 V44 M41 25 V39";

export function BrandMark({ size = 26 }: { size?: number }): ReactNode {
  return (
    <svg className={styles.brandMark} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path className={styles.brandFrame} d={LOGO_FRAME_PATH} />
        <path className={styles.brandWave} d={LOGO_WAVE_PATH} />
      </g>
    </svg>
  );
}
```

`controls.module.css`: port from the prototype `base.css` (`.capsule` and its variants, `.icon-button`, `.brand-mark`, `.brand-frame`, `.brand-wave`) and `components.css` (`.segmented`, `.segmented-thumb`, `.segmented button`, `.switch`, `.stepper*`). Rename kebab-case classes to camelCase (`.capsule.primary` becomes `.capsule.primary`, `.icon-button.small` becomes `.iconButton.small`, `.segmented-thumb` becomes `.segmentedThumb`, `.stepper-value` becomes `.stepperValue`, `.stepper-divider` becomes `.stepperDivider`), add `.stepperGroup { display: inline-flex; align-items: center; gap: 10px; }`, and keep every value, easing and media query from the prototype.

- [ ] **Step 2: Write the failing segmented control test, then implement it**

`apps/web/src/components/controls/Segmented.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Segmented } from "./Segmented";

function Harness(): React.ReactNode {
  const [value, setValue] = useState<"video" | "audio">("video");
  return (
    <Segmented
      label="Type"
      value={value}
      onChange={setValue}
      options={[
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
      ]}
    />
  );
}

describe("Segmented", () => {
  it("selects with clicks and arrow keys and moves the thumb", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Type" });
    expect(screen.getByRole("radio", { name: "Video" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Audio" }));
    expect(screen.getByRole("radio", { name: "Audio" })).toHaveAttribute("aria-checked", "true");
    expect(group.style.getPropertyValue("--index")).toBe("1");
    screen.getByRole("radio", { name: "Audio" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Video" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Video" })).toHaveFocus();
  });
});
```

`apps/web/src/components/controls/Segmented.tsx`:

```tsx
"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon, type IconName } from "./Icon";

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>): ReactNode {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const style = { "--count": options.length, "--index": index } as CSSProperties;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = ARROW_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={styles.segmented} style={style} onKeyDown={handleKeyDown}>
      <span className={styles.segmentedThumb} aria-hidden="true" />
      {options.map((option, optionIndex) => (
        <button
          key={option.value}
          ref={(element) => {
            buttons.current[optionIndex] = element;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? <Icon name={option.icon} size={15} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

`CSSProperties` does not declare custom properties, so the cast on `style` is the one allowed type assertion in this component; it only widens a style object.

- [ ] **Step 3: Media queries and focus trapping**

`apps/web/src/hooks/useMediaQuery.ts`:

```ts
"use client";

import { useSyncExternalStore } from "react";

export const PHONE_QUERY = "(max-width: 767px)";
export const TABLET_QUERY = "(max-width: 1023px)";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
```

`apps/web/src/hooks/useFocusTrap.ts`:

```ts
"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])";

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (focusableWithin(container)[0] ?? container).focus({ preventScroll: true });
    const trap = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(container);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [ref, active]);
}
```

- [ ] **Step 4: Write the failing sheet test, then implement overlays**

`apps/web/src/components/overlays/Sheet.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("renders a labelled dialog, moves focus inside and closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Settings" labelledById="settings-title">
        <button type="button">Inside</button>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={vi.fn()} title="Settings" labelledById="s">
        <p>Hidden</p>
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

`apps/web/src/components/overlays/Sheet.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Capsule } from "../controls/Capsule";
import styles from "./overlays.module.css";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6;
const EXIT_DURATION_MS = 420;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  labelledById: string;
  children: ReactNode;
  footer?: ReactNode;
}

function useStagedPresence(open: boolean): { mounted: boolean; visible: boolean } {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);
  return { mounted: mounted || open, visible };
}

export function Sheet({ open, onClose, title, labelledById, children, footer }: SheetProps): ReactNode {
  const { t } = useI18n();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const panel = useRef<HTMLElement>(null);
  const drag = useRef({ startY: 0, lastY: 0, lastTime: 0, velocity: 0 });
  const [offset, setOffset] = useState(0);
  const { mounted, visible } = useStagedPresence(open);
  useFocusTrap(panel, open && mounted);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.dataset.sheetOpen = isPhone ? "true" : "false";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      delete document.body.dataset.sheetOpen;
    };
  }, [open, onClose, isPhone]);

  if (!mounted) return null;

  const beginDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isPhone) return;
    drag.current = { startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const now = performance.now();
    drag.current.velocity = (event.clientY - drag.current.lastY) / Math.max(now - drag.current.lastTime, 1);
    drag.current.lastY = event.clientY;
    drag.current.lastTime = now;
    setOffset(Math.max(0, event.clientY - drag.current.startY));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const shouldClose = offset > DISMISS_DISTANCE || drag.current.velocity > DISMISS_VELOCITY;
    setOffset(0);
    if (shouldClose) onClose();
  };

  return createPortal(
    <div className={styles.layer} data-visible={visible}>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledById} tabIndex={-1} className={`${styles.panel} ${isPhone ? styles.sheet : styles.modal}`} style={offset > 0 ? { transform: `translateY(${offset}px)`, transition: "none" } : undefined}>
        <div className={styles.handleArea} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <span className={styles.grabber} aria-hidden="true" />
          <header className={styles.head}>
            <h2 id={labelledById}>{title}</h2>
            <Capsule variant="plain" onClick={onClose}>
              {t.settings.done}
            </Capsule>
          </header>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
```

`AlertDialog.tsx`, `Island.tsx`, `ShortcutsHud.tsx`, `DropOverlay.tsx`:

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import styles from "./overlays.module.css";

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AlertDialog({ open, title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel }: AlertDialogProps): ReactNode {
  const panel = useRef<HTMLElement>(null);
  useFocusTrap(panel, open);
  if (!open) return null;
  return createPortal(
    <div className={styles.layer} data-visible="true">
      <div className={styles.scrim} onClick={onCancel} aria-hidden="true" />
      <section ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-message" className={styles.alert}>
        <h2 id="alert-title">{title}</h2>
        <p id="alert-message">{message}</p>
        <div className={styles.alertActions}>
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={destructive ? styles.destructive : styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
```

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Messages } from "@/lib/i18n/en";
import { useStore } from "@/state/StoreProvider";
import type { Notice } from "@/state/types";
import { Icon } from "../controls/Icon";
import styles from "./overlays.module.css";

const VISIBLE_MS = 2800;

function noticeText(notice: Notice, t: Messages): string {
  if (notice.tone === "error") {
    const errors: Record<string, string> = t.errors;
    return errors[notice.message] ?? t.errors.unknown_error;
  }
  switch (notice.message) {
    case "fetched":
      return t.island.fetched;
    case "playlistAdded":
      return t.island.playlistAdded(notice.count ?? 0);
    case "downloaded":
      return t.island.downloaded(notice.detail ?? "");
    case "cancelled":
      return t.island.cancelled;
    case "removedFromQueue":
      return t.island.removedFromQueue;
    case "addedAgain":
      return t.island.addedAgain;
    case "cookiesLoaded":
      return t.island.cookiesLoaded;
    case "cookiesRemoved":
      return t.island.cookiesRemoved;
    case "settingsSaved":
      return t.island.settingsSaved;
    case "pasteFallback":
      return t.importer.pasteFallback;
    case "noLinks":
      return t.importer.noLinks;
    default:
      return notice.message;
  }
}

export function Island(): ReactNode {
  const { t } = useI18n();
  const { state, dispatch } = useStore();
  const notice = state.notice;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => dispatch({ type: "notice/dismissed", id: notice.id }), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, dispatch]);

  return (
    <div className={styles.island} data-open={notice !== null} data-tone={notice?.tone ?? "info"} role="status" aria-live="polite">
      {notice ? (
        <>
          <span className={styles.islandIcon}>
            <Icon name={notice.tone === "error" ? "warningCircle" : "check"} size={14} />
          </span>
          <span className={styles.islandText}>{noticeText(notice, t)}</span>
        </>
      ) : null}
    </div>
  );
}
```

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/lib/i18n/I18nProvider";
import styles from "./overlays.module.css";

const SHORTCUTS = [
  { keys: ["/"], label: "focus" },
  { keys: ["⌘", "V"], label: "pasteFetch" },
  { keys: ["Esc"], label: "close" },
  { keys: ["?"], label: "show" },
] as const;

export function ShortcutsHud({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  const { t } = useI18n();
  const panel = useRef<HTMLElement>(null);
  useFocusTrap(panel, open);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={styles.layer} data-visible="true">
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" className={styles.hud}>
        <h2 id="shortcuts-title">{t.shortcuts.title}</h2>
        <dl className={styles.shortcutList}>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label}>
              <dt>{t.shortcuts[shortcut.label]}</dt>
              <dd>
                {shortcut.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" className={styles.hudClose} onClick={onClose}>
          {t.shortcuts.dismiss}
        </button>
      </section>
    </div>,
    document.body,
  );
}
```

```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Icon } from "../controls/Icon";
import styles from "./overlays.module.css";

const TEXT_TYPES = ["text/uri-list", "text/plain"];

function carriesText(event: DragEvent): boolean {
  return [...(event.dataTransfer?.types ?? [])].some((type) => TEXT_TYPES.includes(type));
}

export function DropOverlay({ onDrop }: { onDrop: (text: string) => void }): ReactNode {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const enter = (event: DragEvent): void => {
      if (!carriesText(event)) return;
      depth.current += 1;
      setVisible(true);
    };
    const leave = (): void => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setVisible(false);
    };
    const over = (event: DragEvent): void => {
      if (carriesText(event)) event.preventDefault();
    };
    const drop = (event: DragEvent): void => {
      depth.current = 0;
      setVisible(false);
      const text = event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain") || "";
      if (!text) return;
      event.preventDefault();
      onDrop(text);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [onDrop]);

  if (!visible) return null;
  return (
    <div className={styles.dropOverlay}>
      <div className={styles.dropTarget}>
        <Icon name="link" size={40} />
        <p>{t.importer.dropTitle}</p>
      </div>
    </div>
  );
}
```

`overlays.module.css`: port `overlays.css` from the prototype. Map `.scrim`, `.modal`, `.modal-head`, `.modal-scroll`, `.hud`, `.shortcut-list`, `.alert`, `.alert-actions`, `.island`, `.island-icon`, `.island-text`, `.drop-overlay`, `.drop-target`, `.sheet-grabber`. New structure classes: `.layer` (fixed full-screen container, `z-index: 50`), `.layer[data-visible="true"] .scrim { opacity: 1 }`, `.panel` (shared), `.modal` (centered, prototype modal rules), `.sheet` (prototype phone modal rules), `.layer[data-visible="true"] .modal` and `.sheet` get the prototype `.is-open` transforms, `.handleArea` (`touch-action: none` on phones), `.head` (prototype `.modal-head`), `.body` (prototype `.modal-scroll`), `.footer`, `.confirm`, `.destructive`, `.hudClose`, `.island[data-open="true"]` for `.island.is-open`, `.island[data-tone="error"] .islandIcon` for the error tint. Keep `prefers-reduced-motion` handling from globals.

- [ ] **Step 5: Run the checks for this half**

Run from the project root: `mise run //apps/web:ci-unit`
Expected: PASS, including `Segmented.test.tsx` and `Sheet.test.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add Apple-style controls, sheets, alerts and the notice island"
```

### Task 11: Queue list and inspector

**Files:**

- Create in `apps/web/src/components/queue/`: `QueueView.tsx`, `QueueRow.tsx`, `QueueRow.test.tsx`, `ProgressRing.tsx`, `Thumbnail.tsx`, `queue.module.css`
- Create in `apps/web/src/components/inspector/`: `Inspector.tsx`, `InspectorContent.tsx`, `OptionsPanel.tsx`, `QualityList.tsx`, `SubtitleOptions.tsx`, `TrimEditor.tsx`, `TrimEditor.test.tsx`, `trim.ts`, `trim.test.ts`, `StatusCard.tsx`, `InspectorFooter.tsx`, `inspector.module.css`
- Create: `apps/web/src/lib/describe.ts`, `apps/web/src/lib/describe.test.ts`
- Modify: `apps/web/src/state/reducer.ts` (export `jobLabel`)

**Interfaces:**

- Consumes: store, commands, i18n, controls, `Sheet`, `estimateBytes`, `isTrimmed`, `api.fileUrl`, `formatBytes`, `formatSpeed`, `formatClock`, `parseClock`.
- Produces:
  - `trim.ts`: `MIN_TRIM_SECONDS = 1`, `TrimEdge = "start" | "end"`, `fullRange(duration)`, `setEdge(range, edge, seconds, duration)`, `nudgeEdge(range, edge, key, shiftKey, duration) -> TrimRange | null`, `secondsAtPointer(clientX, bounds: { left: number; width: number }, duration)`, `nearestEdge(range, seconds) -> TrimEdge`
  - `describe.ts`: `remainingText(seconds: number | null, t) -> string`, `expiryText(expiresAt: string | null, t, now: Date) -> string`, `rowLine(item: QueueItem, t, locale) -> { text: string; tone: "normal" | "error" }`
  - `QueueView({ onOpenItem: (id: string) => void; onOpenCookies: () => void })`, `QueueRow({ item, selected, onSelect, onOpenCookies })`, `ProgressRing({ progress, waiting })`, `Thumbnail({ src, kind, alt, variant: "row" | "artwork" })`
  - `Inspector({ sheetOpen, onCloseSheet, onOpenCookies })`, `TrimEditor({ duration, value, onChange, thumbnail })`, `QualityList({ item, onChange })`, `SubtitleOptions({ options, onChange })`, `OptionsPanel({ item })`, `StatusCard({ item })`, `InspectorFooter({ item, onOpenCookies })`

- [ ] **Step 1: Write the failing trim and description tests**

`apps/web/src/components/inspector/trim.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fullRange, nearestEdge, nudgeEdge, secondsAtPointer, setEdge } from "./trim";

describe("trim math", () => {
  it("keeps at least one second between edges and stays inside the duration", () => {
    const range = fullRange(100);
    expect(setEdge(range, "start", 150, 100)).toEqual({ start: 99, end: 100 });
    expect(setEdge({ start: 40, end: 60 }, "end", 10, 100)).toEqual({ start: 40, end: 41 });
    expect(setEdge(range, "start", -5, 100)).toEqual({ start: 0, end: 100 });
  });

  it("nudges with arrows, shift and home or end", () => {
    const range = { start: 10, end: 50 };
    expect(nudgeEdge(range, "start", "ArrowRight", false, 100)).toEqual({ start: 11, end: 50 });
    expect(nudgeEdge(range, "end", "ArrowLeft", true, 100)).toEqual({ start: 10, end: 40 });
    expect(nudgeEdge(range, "end", "End", false, 100)).toEqual({ start: 10, end: 100 });
    expect(nudgeEdge(range, "start", "Home", false, 100)).toEqual({ start: 0, end: 50 });
    expect(nudgeEdge(range, "start", "Enter", false, 100)).toBeNull();
  });

  it("maps pointer positions and picks the nearest handle", () => {
    expect(secondsAtPointer(150, { left: 100, width: 200 }, 60)).toBe(15);
    expect(secondsAtPointer(50, { left: 100, width: 200 }, 60)).toBe(0);
    expect(nearestEdge({ start: 10, end: 50 }, 20)).toBe("start");
    expect(nearestEdge({ start: 10, end: 50 }, 40)).toBe("end");
  });
});
```

`apps/web/src/lib/describe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Job } from "./api/types";
import { en } from "./i18n/en";
import { expiryText, remainingText, rowLine } from "./describe";

const base: Job = {
  job_id: "j",
  url: "https://youtu.be/a",
  title: "Pho",
  status: "downloading",
  progress: 63.4,
  speed_bps: 4_200_000,
  eta_seconds: 90,
  downloaded_bytes: 1,
  total_bytes: 2,
  queue_position: 0,
  options: { kind: "video", container: "mp4", quality_height: 1080, format_id: null, audio_format: null, audio_quality: null, trim: null, subtitles: null, embed_metadata: true },
  filename: null,
  files: [],
  error: null,
  error_code: null,
  created_at: "2026-09-14T08:00:00Z",
  finished_at: null,
  expires_at: null,
};

const media = { url: base.url, title: "Pho", thumbnail: "", duration: 1122, uploader: "Bep", platform: "youtube" as const };
const options = { kind: "video" as const, container: "mp4" as const, qualityHeight: 1080, audioFormat: "m4a" as const, audioQuality: "best" as const, trim: null, subtitleLanguages: [], subtitleMode: "embed" as const, embedMetadata: true };

describe("describe", () => {
  it("formats remaining time", () => {
    expect(remainingText(7, en)).toBe("7 s left");
    expect(remainingText(90, en)).toBe("1 min 30 s left");
    expect(remainingText(null, en)).toBe("");
  });

  it("formats expiry relative to now", () => {
    expect(expiryText("2026-09-14T09:00:00Z", en, new Date("2026-09-14T08:08:00Z"))).toBe("Deleted in 52 min");
    expect(expiryText(null, en, new Date())).toBe("");
  });

  it("describes rows for each state", () => {
    const job = { type: "job" as const, id: "j", media, formats: [], options };
    expect(rowLine({ ...job, job: base }, en, "en").text).toBe("63% · 4.2 MB/s, 1 min 30 s left");
    expect(rowLine({ ...job, job: { ...base, status: "queued", queue_position: 2 } }, en, "en").text).toBe("Waiting, position 2");
    expect(rowLine({ ...job, job: { ...base, status: "error", error_code: "bot_check" } }, en, "en")).toEqual({ text: en.errors.bot_check, tone: "error" });
    expect(rowLine({ type: "ready", id: "r", media, formats: [], options }, en, "en").text).toBe("Bep, 18:42");
    expect(rowLine({ type: "fetch-error", id: "e", url: "https://x.y", code: "unsupported_url" }, en, "en").tone).toBe("error");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run from `apps/web`: `mise exec -- pnpm exec vitest --run src/components/inspector/trim.test.ts src/lib/describe.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement trim math and descriptions**

`apps/web/src/components/inspector/trim.ts`:

```ts
import type { TrimRange } from "@/lib/api/types";

export const MIN_TRIM_SECONDS = 1;
export const STEP_SECONDS = 1;
export const BIG_STEP_SECONDS = 10;

export type TrimEdge = "start" | "end";

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(Math.max(value, minimum), maximum);

export function fullRange(duration: number): TrimRange {
  return { start: 0, end: duration };
}

export function setEdge(range: TrimRange, edge: TrimEdge, seconds: number, duration: number): TrimRange {
  const rounded = Math.round(seconds);
  return edge === "start" ? { start: clamp(rounded, 0, range.end - MIN_TRIM_SECONDS), end: range.end } : { start: range.start, end: clamp(rounded, range.start + MIN_TRIM_SECONDS, duration) };
}

const KEY_DIRECTIONS: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };

export function nudgeEdge(range: TrimRange, edge: TrimEdge, key: string, shiftKey: boolean, duration: number): TrimRange | null {
  if (key === "Home") return setEdge(range, edge, 0, duration);
  if (key === "End") return setEdge(range, edge, duration, duration);
  const direction = KEY_DIRECTIONS[key];
  if (direction === undefined) return null;
  const current = edge === "start" ? range.start : range.end;
  return setEdge(range, edge, current + direction * (shiftKey ? BIG_STEP_SECONDS : STEP_SECONDS), duration);
}

export function secondsAtPointer(clientX: number, bounds: { left: number; width: number }, duration: number): number {
  const ratio = clamp((clientX - bounds.left) / bounds.width, 0, 1);
  return ratio * duration;
}

export function nearestEdge(range: TrimRange, seconds: number): TrimEdge {
  return Math.abs(seconds - range.start) <= Math.abs(seconds - range.end) ? "start" : "end";
}
```

`apps/web/src/lib/describe.ts`:

```ts
import { jobLabel } from "@/state/reducer";
import type { QueueItem } from "@/state/types";
import { formatBytes, formatClock, formatSpeed, splitDuration, type Locale } from "./format";
import type { Messages } from "./i18n/en";

const MILLISECONDS_PER_MINUTE = 60_000;
const ACTIVE_DOWNLOAD_STATUSES = new Set(["downloading"]);

export function remainingText(seconds: number | null, t: Messages): string {
  if (seconds === null) return "";
  const { hours, minutes, seconds: rest } = splitDuration(Math.max(1, seconds));
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes === 0 ? t.time.secondsLeft(rest) : t.time.minutesLeft(totalMinutes, rest);
}

export function expiryText(expiresAt: string | null, t: Messages, now: Date): string {
  if (expiresAt === null) return "";
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE));
  return t.time.expiresIn(minutes);
}

function errorText(code: string, t: Messages): string {
  const errors: Record<string, string> = t.errors;
  return errors[code] ?? t.errors.unknown_error;
}

export function rowLine(item: QueueItem, t: Messages, locale: Locale): { text: string; tone: "normal" | "error" } {
  if (item.type === "fetching") return { text: t.queue.fetching, tone: "normal" };
  if (item.type === "fetch-error") return { text: errorText(item.code, t), tone: "error" };
  if (item.type === "ready") {
    const duration = item.media.duration === null ? "" : `, ${formatClock(item.media.duration)}`;
    return { text: `${item.media.uploader || item.media.url}${duration}`, tone: "normal" };
  }
  const { job } = item;
  if (job.status === "error") return { text: errorText(job.error_code ?? "unknown_error", t), tone: "error" };
  if (job.status === "queued") return { text: t.queue.queued(job.queue_position), tone: "normal" };
  if (job.status === "processing") return { text: t.queue.processing, tone: "normal" };
  if (job.status === "done") {
    const size = formatBytes(job.files[0]?.size_bytes ?? 0, locale);
    return { text: t.queue.doneLine(jobLabel(job), size, expiryText(job.expires_at, t, new Date())), tone: "normal" };
  }
  if (ACTIVE_DOWNLOAD_STATUSES.has(job.status)) {
    const speed = job.speed_bps === null ? "" : formatSpeed(job.speed_bps, locale);
    return { text: t.queue.downloadingLine(Math.floor(job.progress), speed, remainingText(job.eta_seconds, t)), tone: "normal" };
  }
  return { text: t.queue.cancelled, tone: "normal" };
}
```

Export `jobLabel` from `apps/web/src/state/reducer.ts` by adding `export` to its declaration.

- [ ] **Step 4: Write the failing component tests**

`apps/web/src/components/inspector/TrimEditor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrimEditor } from "./TrimEditor";

describe("TrimEditor", () => {
  it("moves handles with the keyboard and accepts typed times", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TrimEditor duration={120} value={null} onChange={onChange} thumbnail="" />);
    const start = screen.getByRole("slider", { name: "Start point" });
    expect(start).toHaveAttribute("aria-valuetext", "0:00");
    start.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ start: 1, end: 120 });
    const end = screen.getByLabelText("End");
    await user.clear(end);
    await user.type(end, "1:00{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ start: 0, end: 60 });
  });

  it("reports a full range as no trim", async () => {
    const onChange = vi.fn();
    render(<TrimEditor duration={120} value={{ start: 0, end: 119 }} onChange={onChange} thumbnail="" />);
    screen.getByRole("slider", { name: "End point" }).focus();
    await userEvent.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
```

`apps/web/src/components/queue/QueueRow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import type { QueueItem } from "@/state/types";
import { QueueRow } from "./QueueRow";

const media = { url: "https://youtu.be/a", title: "Pho", thumbnail: "", duration: 60, uploader: "Bep", platform: "youtube" as const };
const options = { kind: "video" as const, container: "mp4" as const, qualityHeight: null, audioFormat: "m4a" as const, audioQuality: "best" as const, trim: null, subtitleLanguages: [], subtitleMode: "embed" as const, embedMetadata: true };

function wrap(children: ReactNode): ReactNode {
  return <StoreProvider>{children}</StoreProvider>;
}

describe("QueueRow", () => {
  it("offers cookie settings for a bot check error", async () => {
    vi.spyOn(api, "session").mockResolvedValue({ auth_required: false, authenticated: true, limits: { max_filesize_mb: 1, max_playlist_items: 1 } });
    vi.spyOn(api, "settings").mockResolvedValue({ retention_minutes: 60, max_concurrent: 3 });
    vi.spyOn(api, "storage").mockResolvedValue({ used_bytes: 0, limit_bytes: null, free_bytes: 1 });
    vi.spyOn(api, "cookies").mockResolvedValue({ present: false, domains: [], expires_at: null, uploaded_at: null });
    vi.spyOn(api, "jobs").mockResolvedValue([]);
    const onOpenCookies = vi.fn();
    const item: QueueItem = {
      type: "job",
      id: "j",
      media,
      formats: [],
      options,
      job: { job_id: "j", url: media.url, title: "Pho", status: "error", progress: 0, speed_bps: null, eta_seconds: null, downloaded_bytes: null, total_bytes: null, queue_position: 0, options: { kind: "video", container: "mp4", quality_height: null, format_id: null, audio_format: null, audio_quality: null, trim: null, subtitles: null, embed_metadata: true }, filename: null, files: [], error: "bot", error_code: "bot_check", created_at: "2026-09-14T00:00:00Z", finished_at: null, expires_at: null },
    };
    render(wrap(<QueueRow item={item} selected={false} onSelect={vi.fn()} onOpenCookies={onOpenCookies} />));
    await userEvent.click(screen.getByRole("button", { name: "Fix" }));
    expect(onOpenCookies).toHaveBeenCalled();
  });

  it("links done jobs to their file", () => {
    const item: QueueItem = {
      type: "job",
      id: "d",
      media,
      formats: [],
      options,
      job: { job_id: "d", url: media.url, title: "Pho", status: "done", progress: 100, speed_bps: null, eta_seconds: null, downloaded_bytes: null, total_bytes: null, queue_position: 0, options: { kind: "video", container: "mp4", quality_height: null, format_id: null, audio_format: null, audio_quality: null, trim: null, subtitles: null, embed_metadata: true }, filename: "Pho.mp4", files: [{ index: 0, name: "Pho.mp4", kind: "media", size_bytes: 10 }], error: null, error_code: null, created_at: "2026-09-14T00:00:00Z", finished_at: "2026-09-14T00:01:00Z", expires_at: "2026-09-14T01:01:00Z" },
    };
    render(wrap(<QueueRow item={item} selected={false} onSelect={vi.fn()} onOpenCookies={vi.fn()} />));
    expect(screen.getByRole("link", { name: "Save" })).toHaveAttribute("href", "/api/file/d");
  });
});
```

The tests render with the default English locale because jsdom reports `navigator.language` as `en-US`.

- [ ] **Step 5: Implement queue components**

`apps/web/src/components/queue/ProgressRing.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";
import styles from "./queue.module.css";

export function ProgressRing({ progress, waiting = false }: { progress: number | null; waiting?: boolean }): ReactNode {
  const style = { "--progress": progress ?? 0 } as CSSProperties;
  return (
    <span className={`${styles.ring} ${waiting ? styles.waiting : ""}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <circle className={styles.ringTrack} cx="18" cy="18" r="15.5" pathLength="100" />
        <circle className={styles.ringValue} cx="18" cy="18" r="15.5" pathLength="100" />
      </svg>
      <span className={styles.ringStop} />
    </span>
  );
}
```

`apps/web/src/components/queue/Thumbnail.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import type { DownloadKind } from "@/lib/api/types";
import { Icon } from "../controls/Icon";
import styles from "./queue.module.css";

interface ThumbnailProps {
  src: string;
  kind: DownloadKind;
  alt: string;
  variant: "row" | "artwork";
  badge?: string;
}

export function Thumbnail({ src, kind, alt, variant, badge }: ThumbnailProps): ReactNode {
  const [failed, setFailed] = useState(false);
  const showImage = src !== "" && !failed;
  return (
    <div className={variant === "row" ? styles.thumb : styles.artwork}>
      {showImage ? (
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className={styles.thumbGlyph}>
          <Icon name={kind === "audio" ? "musicNotes" : "filmStrip"} size={variant === "row" ? 18 : 40} />
        </span>
      )}
      {badge ? <span className={styles.artworkBadge}>{badge}</span> : null}
    </div>
  );
}
```

Remote thumbnails come from arbitrary hosts that `next/image` cannot allowlist, so this component uses a plain `img`; turn off the ESLint rule `@next/next/no-img-element` for this file in `apps/web/eslint.config.mjs` with the config entry `{ files: ["src/components/queue/Thumbnail.tsx"], rules: { "@next/next/no-img-element": "off" } }`.

`apps/web/src/components/queue/QueueRow.tsx`:

```tsx
"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { api } from "@/lib/api/client";
import { rowLine } from "@/lib/describe";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import type { QueueItem } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import { Icon, type IconName } from "../controls/Icon";
import { ProgressRing } from "./ProgressRing";
import { Thumbnail } from "./Thumbnail";
import styles from "./queue.module.css";

const PLATFORM_ICONS: Record<string, IconName> = {
  youtube: "youtube",
  tiktok: "tiktok",
  instagram: "instagram",
  soundcloud: "soundcloud",
  x: "xLogo",
  facebook: "facebook",
  vimeo: "vimeo",
  other: "globe",
};

interface QueueRowProps {
  item: QueueItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenCookies: () => void;
}

function Trailing({ item, onOpenCookies }: { item: QueueItem; onOpenCookies: () => void }): ReactNode {
  const { t } = useI18n();
  const { commands } = useStore();
  if (item.type === "fetching") return null;
  if (item.type === "fetch-error")
    return (
      <Capsule variant="tinted" onClick={() => void commands.retryFetch(item.id)}>
        {t.queue.retry}
      </Capsule>
    );
  if (item.type === "ready")
    return (
      <Capsule variant="tinted" onClick={() => void commands.startDownload(item.id)}>
        {t.queue.download}
      </Capsule>
    );
  const { job } = item;
  if (job.status === "done") {
    return (
      <>
        <span className={styles.doneGlyph}>
          <Icon name="checkCircle" size={20} weight="fill" />
        </span>
        <a className={styles.saveLink} href={api.fileUrl(job.job_id)} download={job.filename ?? undefined}>
          {t.queue.save}
        </a>
      </>
    );
  }
  if (job.status === "error") {
    return job.error_code === "bot_check" ? (
      <Capsule variant="tinted" onClick={onOpenCookies}>
        {t.queue.fix}
      </Capsule>
    ) : (
      <Capsule variant="tinted" onClick={() => void commands.retryJob(job.job_id)}>
        {t.queue.retry}
      </Capsule>
    );
  }
  const waiting = job.status === "queued";
  return (
    <button type="button" className={styles.ringButton} aria-label={waiting ? t.queue.removeQueued : t.queue.cancel(item.media.title)} onClick={() => void commands.cancelJob(job.job_id)}>
      <ProgressRing progress={job.progress} waiting={waiting} />
    </button>
  );
}

export function QueueRow({ item, selected, onSelect, onOpenCookies }: QueueRowProps): ReactNode {
  const { t, locale } = useI18n();
  if (item.type === "fetching") {
    return (
      <li className={`${styles.row} ${styles.arriving}`} aria-busy="true">
        <span className={`${styles.thumb} ${styles.skeleton}`} />
        <span className={styles.rowText}>
          <span className={styles.skeletonLine} />
          <span className={`${styles.skeletonLine} ${styles.short}`} />
        </span>
      </li>
    );
  }
  const line = rowLine(item, t, locale);
  const title = item.type === "fetch-error" ? item.url : item.media.title;
  const platform = item.type === "fetch-error" ? "other" : item.media.platform;
  const select = (): void => onSelect(item.id);
  const handleKey = (event: KeyboardEvent<HTMLLIElement>): void => {
    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      select();
    }
  };
  return (
    <li className={`${styles.row} ${styles.arriving}`} role="option" aria-selected={selected} tabIndex={0} onClick={select} onKeyDown={handleKey}>
      {item.type === "fetch-error" ? (
        <span className={`${styles.thumb} ${styles.errorThumb}`}>
          <Icon name="warningCircle" size={20} />
        </span>
      ) : (
        <Thumbnail src={item.media.thumbnail} kind={item.options.kind} alt="" variant="row" />
      )}
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={`${styles.rowLine} ${line.tone === "error" ? styles.errorLine : ""}`}>
          <Icon name={line.tone === "error" ? "warningCircle" : PLATFORM_ICONS[platform]} size={13} />
          <span>{line.text}</span>
        </span>
      </span>
      <span className={styles.rowTrailing} role="presentation" onClick={(event) => event.stopPropagation()}>
        <Trailing item={item} onOpenCookies={onOpenCookies} />
      </span>
    </li>
  );
}
```

The trailing span stops click propagation so its controls do not also select the row; give it `role="presentation"` so the accessibility lint rules accept the handler.

`apps/web/src/components/queue/QueueView.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { countItems, visibleItems } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import { Capsule } from "../controls/Capsule";
import { QueueRow } from "./QueueRow";
import styles from "./queue.module.css";

export function QueueView({ onOpenItem, onOpenCookies }: { onOpenItem: (id: string) => void; onOpenCookies: () => void }): ReactNode {
  const { t } = useI18n();
  const { state, dispatch, commands } = useStore();
  const items = visibleItems(state);
  const counts = countItems(state);
  const readyCount = state.items.filter((item) => item.type === "ready").length;
  const select = (id: string): void => {
    dispatch({ type: "item/selected", id });
    onOpenItem(id);
  };
  return (
    <section className={styles.view} aria-label={t.queue.listLabel}>
      <div className={styles.viewBar}>
        <p className={styles.summary}>{t.queue.summary(counts.all, counts.active, counts.done)}</p>
        <div className={styles.viewActions}>
          {state.settings ? <span className={styles.note}>{t.queue.concurrency(state.settings.max_concurrent)}</span> : null}
          <Capsule variant="tinted" disabled={readyCount === 0} onClick={() => void commands.startAllReady()}>
            {t.queue.startAll(readyCount)}
          </Capsule>
        </div>
      </div>
      {items.length > 0 ? (
        <ul className={styles.list} role="listbox" aria-label={t.queue.listLabel}>
          {items.map((item) => (
            <QueueRow key={item.id} item={item} selected={item.id === state.selectedId} onSelect={select} onOpenCookies={onOpenCookies} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t.queue.empty}</p>
      )}
    </section>
  );
}
```

`queue.module.css`: port from the prototype `components.css` (`.list`, `.row` including separators, hover, selected and `.is-arriving`, `.thumb`, `.thumb-glyph`, `.row-text`, `.row-title`, `.row-sub`, `.row-trailing`, `.ring-button`, `.ring*`, `.status-glyph.done`, `.skeleton-line`, `.skeleton-thumb`) and `layout.css` (`.view`, `.view-bar`, `.view-summary`, `.view-actions`, `.view-note`, `.empty`) plus the phone overrides. Class names: `list`, `row`, `arriving`, `thumb`, `thumbGlyph`, `skeleton`, `skeletonLine`, `short`, `errorThumb` (red tinted background with the error color), `rowText`, `rowTitle`, `rowLine`, `errorLine`, `rowTrailing`, `ringButton`, `ring`, `waiting`, `ringTrack`, `ringValue` (with `stroke-dashoffset: calc(100 - var(--progress))`), `ringStop`, `doneGlyph`, `saveLink` (styled as the gray capsule), `artwork`, `artworkBadge`, `view`, `viewBar`, `summary`, `viewActions`, `note`, `empty`. On phones the selected row keeps a transparent background, as in the prototype.

- [ ] **Step 6: Implement the inspector**

`apps/web/src/components/inspector/TrimEditor.tsx`:

```tsx
"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { TrimRange } from "@/lib/api/types";
import { formatClock, parseClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Icon } from "../controls/Icon";
import styles from "./inspector.module.css";
import { fullRange, nearestEdge, nudgeEdge, secondsAtPointer, setEdge, type TrimEdge } from "./trim";

const FRAME_WIDTH = 92;

interface TrimEditorProps {
  duration: number;
  value: TrimRange | null;
  onChange: (range: TrimRange | null) => void;
  thumbnail: string;
}

function edgeFromTarget(target: EventTarget): TrimEdge | null {
  const edge = target instanceof HTMLElement ? target.closest<HTMLElement>("[data-edge]")?.dataset.edge : undefined;
  return edge === "start" || edge === "end" ? edge : null;
}

function toValue(range: TrimRange, duration: number): TrimRange | null {
  return range.start === 0 && range.end === duration ? null : range;
}

export function TrimEditor({ duration, value, onChange, thumbnail }: TrimEditorProps): ReactNode {
  const { t } = useI18n();
  const range = value ?? fullRange(duration);
  const track = useRef<HTMLDivElement>(null);
  const handles = { start: useRef<HTMLButtonElement>(null), end: useRef<HTMLButtonElement>(null) };
  const [dragging, setDragging] = useState<TrimEdge | null>(null);
  const [draft, setDraft] = useState<Record<TrimEdge, string | null>>({ start: null, end: null });

  const commit = (next: TrimRange): void => onChange(toValue(next, duration));
  const edgeAt = (clientX: number): { edge: TrimEdge; seconds: number } | null => {
    const bounds = track.current?.getBoundingClientRect();
    if (!bounds) return null;
    const seconds = secondsAtPointer(clientX, bounds, duration);
    return { edge: nearestEdge(range, seconds), seconds };
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>): void => {
    const target = edgeAt(event.clientX);
    if (!target) return;
    const edge = edgeFromTarget(event.target) ?? target.edge;
    event.currentTarget.setPointerCapture(event.pointerId);
    handles[edge].current?.focus({ preventScroll: true });
    setDragging(edge);
    commit(setEdge(range, edge, target.seconds, duration));
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>): void => {
    const target = dragging ? edgeAt(event.clientX) : null;
    if (dragging && target) commit(setEdge(range, dragging, target.seconds, duration));
  };
  const endDrag = (): void => setDragging(null);

  const handleKey =
    (edge: TrimEdge) =>
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      const next = nudgeEdge(range, edge, event.key, event.shiftKey, duration);
      if (!next) return;
      event.preventDefault();
      commit(next);
    };

  const commitTyped = (edge: TrimEdge): void => {
    const text = draft[edge];
    setDraft((current) => ({ ...current, [edge]: null }));
    if (text === null) return;
    const seconds = parseClock(text);
    if (seconds === null || seconds > duration) return;
    commit(setEdge(range, edge, seconds, duration));
  };

  const startPercent = (range.start / duration) * 100;
  const endPercent = (range.end / duration) * 100;
  const filmstrip = thumbnail ? { backgroundImage: `url("${thumbnail}")`, backgroundSize: `${FRAME_WIDTH}px 100%` } : undefined;

  return (
    <div className={`${styles.trim} ${dragging ? styles.dragging : ""}`}>
      <div ref={track} className={styles.trimTrack} style={filmstrip} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <span className={styles.trimShadeStart} style={{ width: `${startPercent}%` }} />
        <span className={styles.trimShadeEnd} style={{ width: `${100 - endPercent}%` }} />
        <span className={styles.trimFrame} style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }} />
        {(["start", "end"] as const).map((edge) => (
          <button key={edge} ref={handles[edge]} type="button" role="slider" data-edge={edge} className={`${styles.trimHandle} ${edge === "start" ? styles.handleStart : styles.handleEnd}`} style={{ left: `${edge === "start" ? startPercent : endPercent}%` }} aria-label={edge === "start" ? t.inspector.trimStartHandle : t.inspector.trimEndHandle} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(range[edge])} aria-valuetext={formatClock(range[edge])} onKeyDown={handleKey(edge)}>
            <Icon name="caretRight" size={12} weight="bold" />
          </button>
        ))}
      </div>
      <div className={styles.trimTimes}>
        {(["start", "end"] as const).map((edge) => (
          <label key={edge} className={`${styles.timeField} ${edge === "end" ? styles.timeFieldEnd : ""}`}>
            {edge === "start" ? t.inspector.trimStart : t.inspector.trimEnd}
            <input
              inputMode="numeric"
              autoComplete="off"
              value={draft[edge] ?? formatClock(range[edge])}
              onChange={(event) => setDraft((current) => ({ ...current, [edge]: event.target.value }))}
              onBlur={() => commitTyped(edge)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitTyped(edge);
              }}
            />
          </label>
        ))}
      </div>
      <p className={styles.trimLength}>{t.inspector.trimLength(formatClock(range.end - range.start))}</p>
    </div>
  );
}
```

`QualityList.tsx`, `SubtitleOptions.tsx`, `OptionsPanel.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { estimateBytes } from "@/state/options";
import type { DraftOptions, ReadyItem } from "@/state/types";
import { Icon } from "../controls/Icon";
import styles from "./inspector.module.css";

interface Choice {
  readonly key: string;
  readonly label: string;
  readonly checked: boolean;
  readonly patch: Partial<DraftOptions>;
}

function choicesFor(item: ReadyItem, labels: { best: string; original: string; lossless: string }): Choice[] {
  const { options, formats } = item;
  if (options.kind === "audio") {
    if (options.audioFormat === "flac" || options.audioFormat === "wav") {
      return [{ key: "best", label: labels.lossless, checked: true, patch: { audioQuality: "best" } }];
    }
    return [
      { key: "320k", label: "320 kbps", checked: options.audioQuality === "320k", patch: { audioQuality: "320k" } },
      { key: "best", label: labels.original, checked: options.audioQuality === "best", patch: { audioQuality: "best" } },
    ];
  }
  if (formats.length === 0) return [{ key: "best", label: labels.best, checked: true, patch: { qualityHeight: null } }];
  return formats.map((format) => ({ key: format.id, label: format.label, checked: format.height === options.qualityHeight, patch: { qualityHeight: format.height } }));
}

export function QualityList({ item, onChange }: { item: ReadyItem; onChange: (patch: Partial<DraftOptions>) => void }): ReactNode {
  const { t, locale } = useI18n();
  const choices = choicesFor(item, { best: t.inspector.qualityBest, original: t.inspector.audioOriginal, lossless: t.inspector.audioLossless });
  return (
    <div className={styles.groupBody} role="radiogroup" aria-label={t.inspector.quality}>
      {choices.map((choice) => {
        const size = estimateBytes({ ...item.options, ...choice.patch }, item.formats, item.media.duration);
        return (
          <button key={choice.key} type="button" role="radio" aria-checked={choice.checked} className={styles.choice} onClick={() => onChange(choice.patch)}>
            <span className={styles.choiceCheck}>
              <Icon name="check" size={16} weight="bold" />
            </span>
            <span className={styles.choiceName}>{choice.label}</span>
            <span className={styles.choiceSize}>{size === null ? "" : formatBytes(size, locale)}</span>
          </button>
        );
      })}
    </div>
  );
}
```

```tsx
"use client";

import type { ReactNode } from "react";
import type { SubtitleMode } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DraftOptions } from "@/state/types";
import { Segmented } from "../controls/Segmented";
import styles from "./inspector.module.css";

type SubtitleChoice = "off" | "vi" | "en";

export function SubtitleOptions({ options, onChange }: { options: DraftOptions; onChange: (patch: Partial<DraftOptions>) => void }): ReactNode {
  const { t } = useI18n();
  const first = options.subtitleLanguages[0];
  const current: SubtitleChoice = first === "vi" || first === "en" ? first : "off";
  return (
    <div className={styles.cellStack}>
      <Segmented<SubtitleChoice>
        label={t.inspector.subtitles}
        value={current}
        onChange={(choice) => onChange({ subtitleLanguages: choice === "off" ? [] : [choice] })}
        options={[
          { value: "off", label: t.inspector.subtitlesOff },
          { value: "vi", label: t.inspector.subtitlesVietnamese },
          { value: "en", label: t.inspector.subtitlesEnglish },
        ]}
      />
      {current !== "off" ? (
        <Segmented<SubtitleMode>
          label={t.inspector.subtitles}
          value={options.subtitleMode}
          onChange={(mode) => onChange({ subtitleMode: mode })}
          options={[
            { value: "embed", label: t.inspector.subtitleEmbed },
            { value: "srt", label: t.inspector.subtitleFile },
          ]}
        />
      ) : null}
    </div>
  );
}
```

```tsx
"use client";

import type { ReactNode } from "react";
import type { AudioFormat, Container, DownloadKind } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import type { DraftOptions, ReadyItem } from "@/state/types";
import { Segmented } from "../controls/Segmented";
import { Switch } from "../controls/Switch";
import styles from "./inspector.module.css";
import { QualityList } from "./QualityList";
import { SubtitleOptions } from "./SubtitleOptions";
import { TrimEditor } from "./TrimEditor";

const AUDIO_FORMATS: readonly AudioFormat[] = ["mp3", "m4a", "opus", "flac", "wav"];
const CONTAINERS: readonly Container[] = ["mp4", "mkv"];

export function OptionsPanel({ item }: { item: ReadyItem }): ReactNode {
  const { t } = useI18n();
  const { dispatch } = useStore();
  const { options } = item;
  const change = (patch: Partial<DraftOptions>): void => dispatch({ type: "item/optionsChanged", id: item.id, patch });
  return (
    <div className={styles.options}>
      <div className={styles.group}>
        <div className={styles.cellStack}>
          <Segmented<DownloadKind>
            label={t.inspector.kind}
            value={options.kind}
            onChange={(kind) => change({ kind })}
            options={[
              { value: "video", label: t.inspector.video, icon: "videoCamera" },
              { value: "audio", label: t.inspector.audio, icon: "musicNotes" },
            ]}
          />
          {options.kind === "video" ? <Segmented<Container> label={t.inspector.format} value={options.container} onChange={(container) => change({ container })} options={CONTAINERS.map((value) => ({ value, label: value.toUpperCase() }))} /> : <Segmented<AudioFormat> label={t.inspector.format} value={options.audioFormat} onChange={(audioFormat) => change({ audioFormat })} options={AUDIO_FORMATS.map((value) => ({ value, label: value === "opus" ? "Opus" : value.toUpperCase() }))} />}
        </div>
      </div>
      <div className={styles.group}>
        <p className={styles.groupLabel}>{t.inspector.quality}</p>
        <QualityList item={item} onChange={change} />
      </div>
      {item.media.duration ? (
        <div className={styles.group}>
          <p className={styles.groupLabel}>{t.inspector.trim}</p>
          <div className={styles.groupBody}>
            <div className={styles.cellStack}>
              <TrimEditor duration={item.media.duration} value={options.trim} onChange={(trim) => change({ trim })} thumbnail={item.media.thumbnail} />
            </div>
          </div>
          <p className={styles.groupNote}>{t.inspector.trimHelp}</p>
        </div>
      ) : null}
      <div className={styles.group}>
        {options.kind === "video" ? <p className={styles.groupLabel}>{t.inspector.subtitles}</p> : null}
        <div className={styles.groupBody}>
          {options.kind === "video" ? <SubtitleOptions options={options} onChange={change} /> : null}
          <div className={styles.cell}>
            <span id={`embed-${item.id}`}>{t.inspector.embedMetadata}</span>
            <Switch checked={options.embedMetadata} onChange={(embedMetadata) => change({ embedMetadata })} labelledBy={`embed-${item.id}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

`StatusCard.tsx` and `InspectorFooter.tsx`:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { remainingText } from "@/lib/describe";
import { formatBytes, formatSpeed } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { jobLabel } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import type { FetchErrorItem, JobItem } from "@/state/types";
import { Icon } from "../controls/Icon";
import styles from "./inspector.module.css";

function errorMessage(code: string, messages: Record<string, string>, fallback: string): string {
  return messages[code] ?? fallback;
}

export function StatusCard({ item }: { item: JobItem | FetchErrorItem }): ReactNode {
  const { t, locale } = useI18n();
  const { state } = useStore();
  const errors: Record<string, string> = t.errors;
  if (item.type === "fetch-error") {
    return (
      <div className={styles.statusCard}>
        <span className={`${styles.statusGlyph} ${styles.error}`}>
          <Icon name="warningCircle" size={40} />
        </span>
        <div>
          <strong>{t.inspector.errorTitle}</strong>
          <p>{errorMessage(item.code, errors, t.errors.unknown_error)}</p>
        </div>
      </div>
    );
  }
  const { job } = item;
  if (job.status === "downloading") {
    const style = { "--progress": job.progress } as CSSProperties;
    const detail = [job.speed_bps === null ? "" : formatSpeed(job.speed_bps, locale), remainingText(job.eta_seconds, t)].filter(Boolean).join(", ");
    return (
      <div className={styles.statusCard} aria-live="polite">
        <span className={styles.bigRing} style={style}>
          <svg viewBox="0 0 36 36">
            <circle className={styles.ringTrack} cx="18" cy="18" r="15.5" pathLength="100" />
            <circle className={styles.ringValue} cx="18" cy="18" r="15.5" pathLength="100" />
          </svg>
          <span className={styles.bigRingLabel}>{Math.floor(job.progress)}%</span>
        </span>
        <div>
          <strong>{t.inspector.downloadingTitle(jobLabel(job))}</strong>
          <p>{detail}</p>
        </div>
      </div>
    );
  }
  const cards: Record<string, { icon: "timer" | "arrowClockwise" | "checkCircle" | "warningCircle"; tone: string; title: string; body: string }> = {
    queued: { icon: "timer", tone: "", title: t.inspector.queuedTitle(job.queue_position), body: t.inspector.queuedHelp },
    processing: { icon: "arrowClockwise", tone: "", title: t.inspector.processingTitle, body: t.inspector.processingHelp },
    done: { icon: "checkCircle", tone: styles.done, title: t.inspector.doneTitle, body: `${jobLabel(job)}, ${formatBytes(job.files[0]?.size_bytes ?? 0, locale)}` },
    error: { icon: "warningCircle", tone: styles.error, title: t.inspector.errorTitle, body: errorMessage(job.error_code ?? "unknown_error", errors, job.error ?? t.errors.unknown_error) },
  };
  const card = cards[job.status] ?? cards.error;
  return (
    <div className={styles.statusCard}>
      <span className={`${styles.statusGlyph} ${card.tone}`}>
        <Icon name={card.icon} size={40} weight={job.status === "done" ? "fill" : "regular"} />
      </span>
      <div>
        <strong>{card.title}</strong>
        <p>{card.body}</p>
        {job.status === "error" && state.cookies?.present ? <p>{t.inspector.cookiesReady}</p> : null}
      </div>
    </div>
  );
}
```

```tsx
"use client";

import type { ReactNode } from "react";
import { api } from "@/lib/api/client";
import { expiryText } from "@/lib/describe";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { estimateBytes, isTrimmed } from "@/state/options";
import { useStore } from "@/state/StoreProvider";
import type { QueueItem } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import styles from "./inspector.module.css";

export function InspectorFooter({ item, onOpenCookies }: { item: QueueItem; onOpenCookies: () => void }): ReactNode {
  const { t, locale } = useI18n();
  const { commands } = useStore();
  if (item.type === "fetching") return null;
  if (item.type === "fetch-error") {
    return (
      <>
        <Capsule variant="destructive" onClick={() => void commands.removeItem(item.id)}>
          {t.queue.remove}
        </Capsule>
        <Capsule variant="primary" size="large" icon="arrowClockwise" onClick={() => void commands.retryFetch(item.id)}>
          {t.queue.retry}
        </Capsule>
      </>
    );
  }
  if (item.type === "ready") {
    const trimmed = isTrimmed(item.options, item.media.duration);
    const size = estimateBytes(item.options, item.formats, item.media.duration);
    return (
      <>
        <div className={styles.estimate}>
          <span>{trimmed ? t.inspector.selection : t.inspector.estimate}</span>
          <strong>{size === null ? "" : formatBytes(size, locale)}</strong>
        </div>
        <Capsule variant="primary" size="large" icon="download" onClick={() => void commands.startDownload(item.id)}>
          {trimmed ? t.inspector.downloadSelection : t.inspector.downloadAll}
        </Capsule>
      </>
    );
  }
  const { job } = item;
  if (job.status === "done") {
    return (
      <>
        <div className={styles.estimate}>
          <span>{expiryText(job.expires_at, t, new Date())}</span>
          <strong>{formatBytes(job.files[0]?.size_bytes ?? 0, locale)}</strong>
        </div>
        <div className={styles.footActions}>
          {job.files.slice(1).map((file) => (
            <a key={file.index} className={styles.secondaryLink} href={api.fileUrl(job.job_id, file.index)} download={file.name}>
              {t.inspector.subtitleFileName(file.name)}
            </a>
          ))}
          <a className={styles.primaryLink} href={api.fileUrl(job.job_id)} download={job.filename ?? undefined}>
            {t.inspector.saveToDevice}
          </a>
        </div>
      </>
    );
  }
  if (job.status === "error") {
    return job.error_code === "bot_check" ? (
      <Capsule variant="primary" size="large" icon="cookie" onClick={onOpenCookies}>
        {t.inspector.addCookies}
      </Capsule>
    ) : (
      <Capsule variant="primary" size="large" icon="arrowClockwise" onClick={() => void commands.retryJob(job.job_id)}>
        {t.queue.retry}
      </Capsule>
    );
  }
  return (
    <>
      <span className={styles.estimateNote}>{t.inspector.keepsRunning}</span>
      <Capsule variant="destructive" size="large" onClick={() => void commands.cancelJob(job.job_id)}>
        {job.status === "queued" ? t.queue.removeQueued : t.queue.remove}
      </Capsule>
    </>
  );
}
```

`InspectorContent.tsx` and `Inspector.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { QueueItem } from "@/state/types";
import { Thumbnail } from "../queue/Thumbnail";
import styles from "./inspector.module.css";
import { OptionsPanel } from "./OptionsPanel";
import { StatusCard } from "./StatusCard";

export function InspectorContent({ item }: { item: QueueItem | null }): ReactNode {
  const { t } = useI18n();
  if (!item || item.type === "fetching") return <p className={styles.emptyState}>{t.inspector.empty}</p>;
  if (item.type === "fetch-error") return <StatusCard item={item} />;
  return (
    <>
      <Thumbnail key={item.id} src={item.media.thumbnail} kind={item.options.kind} alt={t.inspector.artworkAlt(item.media.title)} variant="artwork" badge={item.media.duration ? formatClock(item.media.duration) : undefined} />
      <div className={styles.titleBlock}>
        <h2>{item.media.title}</h2>
        <p className={styles.meta}>{[item.media.uploader, item.media.url.replace(/^https?:\/\//, "").split("/")[0]].filter(Boolean).join(" · ")}</p>
      </div>
      {item.type === "ready" ? <OptionsPanel item={item} /> : <StatusCard item={item} />}
    </>
  );
}
```

```tsx
"use client";

import type { ReactNode } from "react";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { selectedItem } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import { Sheet } from "../overlays/Sheet";
import { InspectorContent } from "./InspectorContent";
import { InspectorFooter } from "./InspectorFooter";
import styles from "./inspector.module.css";

interface InspectorProps {
  sheetOpen: boolean;
  onCloseSheet: () => void;
  onOpenCookies: () => void;
}

export function Inspector({ sheetOpen, onCloseSheet, onOpenCookies }: InspectorProps): ReactNode {
  const { t } = useI18n();
  const { state } = useStore();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const item = selectedItem(state);
  const footer = item ? <InspectorFooter item={item} onOpenCookies={onOpenCookies} /> : null;
  if (isPhone) {
    return (
      <Sheet open={sheetOpen && item !== null} onClose={onCloseSheet} title={t.inspector.title} labelledById="inspector-title" footer={footer}>
        <InspectorContent item={item} />
      </Sheet>
    );
  }
  return (
    <aside className={styles.inspector} aria-label={t.inspector.title}>
      <div className={styles.scroll}>
        <InspectorContent item={item} />
      </div>
      {footer ? <footer className={styles.foot}>{footer}</footer> : null}
    </aside>
  );
}
```

`inspector.module.css`: port from the prototype `components.css` (`.group`, `.group-label`, `.group-note`, `.group-body`, `.cell`, `.cell-stack` and separators, `.choice*`, `.trim*`, `.time-field*`, `.trim-length`, `.artwork*`, `.inspector-title`, `.inspector-meta`, `.inspector-options`, `.status-card`, `.big-ring*`, `.status-glyph`, `.foot-estimate`) and `layout.css` (`.inspector`, `.inspector-scroll`, `.inspector-foot`). Class names used above: `inspector`, `scroll`, `foot`, `emptyState`, `titleBlock`, `meta`, `options`, `group`, `groupLabel`, `groupNote`, `groupBody`, `cell`, `cellStack`, `choice`, `choiceCheck`, `choiceName`, `choiceSize`, `trim`, `dragging`, `trimTrack`, `trimShadeStart`, `trimShadeEnd`, `trimFrame`, `trimHandle`, `handleStart`, `handleEnd`, `trimTimes`, `timeField`, `timeFieldEnd`, `trimLength`, `statusCard`, `statusGlyph`, `done`, `error`, `bigRing`, `bigRingLabel`, `ringTrack`, `ringValue`, `estimate`, `estimateNote`, `footActions`, `primaryLink` (primary capsule look), `secondaryLink` (gray capsule look).

- [ ] **Step 7: Run the web checks**

Run from the project root: `mise run //apps/web:ci-unit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the download queue and the options inspector with trimming"
```

### Task 12: History, settings, sign-in and PWA

**Files:**

- Create: `apps/web/src/components/history/HistoryView.tsx`, `apps/web/src/components/history/history.module.css`
- Create: `apps/web/src/components/settings/SettingsSheet.tsx`, `apps/web/src/components/settings/SettingsSheet.test.tsx`, `apps/web/src/components/settings/settings.module.css`
- Create: `apps/web/src/components/auth/LoginScreen.tsx`, `apps/web/src/components/auth/LoginScreen.test.tsx`, `apps/web/src/components/auth/auth.module.css`
- Create: `apps/web/src/app/manifest.ts`, `apps/web/src/app/manifest.test.ts`, `apps/web/src/app/icon.svg`, `apps/web/src/app/apple-icon.tsx`, `apps/web/src/app/pwa-icon/[size]/route.tsx`, `apps/web/src/lib/brand.ts`

**Interfaces:**

- Consumes: store, commands, i18n, controls, `Sheet`, `AlertDialog`, `formatBytes`, `ACCENTS`, `DefaultFormatId`, `LOGO_FRAME_PATH`, `LOGO_WAVE_PATH`.
- Produces: `HistoryView({ onClearRequest })`, `SettingsSheet({ open, onClose, focusCookies })`, `LoginScreen()`, `manifest()`, `brandSvg({ frame, wave, background? }) -> string`, `PWA_ICON_SIZES = [192, 512]`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/components/settings/SettingsSheet.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import { SettingsSheet } from "./SettingsSheet";

function mockServer(): void {
  vi.spyOn(api, "session").mockResolvedValue({ auth_required: false, authenticated: true, limits: { max_filesize_mb: 4096, max_playlist_items: 50 } });
  vi.spyOn(api, "settings").mockResolvedValue({ retention_minutes: 60, max_concurrent: 3 });
  vi.spyOn(api, "storage").mockResolvedValue({ used_bytes: 1_800_000_000, limit_bytes: null, free_bytes: 18_200_000_000 });
  vi.spyOn(api, "cookies").mockResolvedValue({ present: false, domains: [], expires_at: null, uploaded_at: null });
  vi.spyOn(api, "jobs").mockResolvedValue([]);
}

describe("SettingsSheet", () => {
  it("uploads cookies and saves server settings", async () => {
    mockServer();
    const upload = vi.spyOn(api, "uploadCookies").mockResolvedValue({ present: true, domains: ["youtube.com"], expires_at: "2030-01-01T00:00:00Z", uploaded_at: "2026-09-14T00:00:00Z" });
    const save = vi.spyOn(api, "updateSettings").mockResolvedValue({ retention_minutes: 360, max_concurrent: 3 });
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <SettingsSheet open onClose={vi.fn()} focusCookies={false} />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByText("No cookies yet")).toBeInTheDocument());
    const file = new File(["# Netscape HTTP Cookie File"], "cookies.txt", { type: "text/plain" });
    await user.upload(screen.getByLabelText("Choose cookies.txt"), file);
    expect(upload).toHaveBeenCalledWith(file);
    await user.click(screen.getByRole("radio", { name: "6 hours" }));
    expect(save).toHaveBeenCalledWith({ retention_minutes: 360 });
  });

  it("switches the accent color immediately", async () => {
    mockServer();
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <SettingsSheet open onClose={vi.fn()} focusCookies={false} />
      </StoreProvider>,
    );
    await user.click(screen.getByRole("radio", { name: "Pink" }));
    await waitFor(() => expect(document.documentElement.dataset.accent).toBe("pink"));
  });
});
```

`apps/web/src/components/auth/LoginScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "@/lib/api/client";
import { StoreProvider } from "@/state/StoreProvider";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("shows an error for a wrong password", async () => {
    vi.spyOn(api, "session").mockResolvedValue({ auth_required: true, authenticated: false, limits: { max_filesize_mb: 1, max_playlist_items: 1 } });
    vi.spyOn(api, "signIn").mockRejectedValue(new ApiRequestError(401, "invalid_password", "no", null));
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <LoginScreen />
      </StoreProvider>,
    );
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("The password is not correct."));
  });
});
```

`apps/web/src/app/manifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("declares an installable app with a share target", () => {
    const value = manifest();
    expect(value.name).toBe("OpenMedia");
    expect(value.display).toBe("standalone");
    expect(value.theme_color).toBe("#12939c");
    expect(value.icons?.map((icon) => icon.sizes)).toEqual(["any", "192x192", "512x512", "512x512"]);
    expect(value.share_target).toEqual({ action: "/", method: "GET", params: { url: "url", text: "text", title: "title" } });
  });
});
```

`manifest.test.ts` runs in the node vitest project: add `"src/app/manifest.test.ts"` to that project's `include` and to the dom project's `exclude` in `vitest.config.ts`.

- [ ] **Step 2: Run them to see them fail**

Run from `apps/web`: `mise exec -- pnpm exec vitest --run src/components/settings src/components/auth src/app/manifest.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement history**

`apps/web/src/components/history/HistoryView.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { Capsule } from "../controls/Capsule";
import { Icon } from "../controls/Icon";
import styles from "./history.module.css";

const DATE_TAGS = { vi: "vi-VN", en: "en-US" } as const;

export function HistoryView({ onClearRequest }: { onClearRequest: () => void }): ReactNode {
  const { t, locale } = useI18n();
  const { state, commands } = useStore();
  const dateFormat = new Intl.DateTimeFormat(DATE_TAGS[locale], { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={styles.view} aria-label={t.history.title}>
      <div className={styles.viewBar}>
        <p className={styles.note}>{t.history.note}</p>
        <Capsule variant="destructive" disabled={state.history.length === 0} onClick={onClearRequest}>
          {t.history.clear}
        </Capsule>
      </div>
      {state.history.length === 0 ? (
        <p className={styles.empty}>{t.history.empty}</p>
      ) : (
        <ul className={styles.list}>
          {state.history.map((entry) => (
            <li key={entry.id} className={styles.row}>
              <span className={styles.glyph}>
                <Icon name={entry.kind === "audio" ? "musicNotes" : "filmStrip"} size={20} />
              </span>
              <span className={styles.text}>
                <span className={styles.title}>{entry.title}</span>
                <span className={styles.detail}>{`${entry.label}, ${formatBytes(entry.sizeBytes, locale)}, ${dateFormat.format(new Date(entry.finishedAt))}`}</span>
              </span>
              <Capsule variant="tinted" onClick={() => void commands.downloadAgain(entry.id)}>
                {t.history.again}
              </Capsule>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`history.module.css` reuses the prototype `.list`, `.row`, `.row-text`, `.row-title`, `.row-sub`, `.history-glyph`, `.view-bar` rules under the class names `view`, `viewBar`, `note`, `empty`, `list`, `row`, `glyph`, `text`, `title`, `detail`.

- [ ] **Step 4: Implement settings**

`apps/web/src/components/settings/SettingsSheet.tsx`:

```tsx
"use client";

import { useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import type { StorageUsage } from "@/lib/api/types";
import { formatBytes, type Locale } from "@/lib/format";
import type { Messages } from "@/lib/i18n/en";
import { useI18n, type LanguagePreference } from "@/lib/i18n/I18nProvider";
import { ACCENTS, type ThemePreference } from "@/lib/theme";
import { useStore } from "@/state/StoreProvider";
import type { DefaultFormatId } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import { Icon } from "../controls/Icon";
import { Segmented } from "../controls/Segmented";
import { Stepper } from "../controls/Stepper";
import { Sheet } from "../overlays/Sheet";
import styles from "./settings.module.css";

const RETENTION_CHOICES = ["15", "60", "360", "1440"] as const;
const DEFAULT_FORMATS: readonly DefaultFormatId[] = ["video-mp4-1080", "video-mp4-720", "audio-m4a", "audio-mp3"];
const LANGUAGES: readonly LanguagePreference[] = ["auto", "vi", "en"];
const MILLISECONDS_PER_DAY = 86_400_000;

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  focusCookies: boolean;
}

function daysUntil(isoDate: string | null): number {
  return isoDate === null ? 0 : Math.max(0, Math.round((new Date(isoDate).getTime() - Date.now()) / MILLISECONDS_PER_DAY));
}

function storagePercent(storage: StorageUsage | null): number {
  if (storage === null) return 0;
  const total = storage.limit_bytes ?? storage.used_bytes + storage.free_bytes;
  return total > 0 ? Math.min(100, (storage.used_bytes / total) * 100) : 0;
}

function storageText(storage: StorageUsage | null, t: Messages, locale: Locale): string {
  if (storage === null) return "";
  const used = formatBytes(storage.used_bytes, locale);
  return storage.limit_bytes === null ? t.settings.storageUsedUnlimited(used, formatBytes(storage.free_bytes, locale)) : t.settings.storageUsed(used, formatBytes(storage.limit_bytes, locale));
}

export function SettingsSheet({ open, onClose, focusCookies }: SettingsSheetProps): ReactNode {
  const { t, locale } = useI18n();
  const { state, dispatch, commands } = useStore();
  const cookiesGroup = useRef<HTMLDivElement>(null);
  const { settings, storage, cookies, preferences, session } = state;

  useEffect(() => {
    if (open && focusCookies) cookiesGroup.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [open, focusCookies]);

  const chooseCookies = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void commands.uploadCookies(file);
  };

  const retentionValue = RETENTION_CHOICES.find((choice) => Number(choice) === settings?.retention_minutes) ?? "60";
  const chooseDefaultFormat = (value: string): void => {
    const defaultFormat = DEFAULT_FORMATS.find((format) => format === value);
    if (defaultFormat) dispatch({ type: "preferences/changed", patch: { defaultFormat } });
  };
  const chooseLanguage = (value: string): void => {
    const language = LANGUAGES.find((candidate) => candidate === value);
    if (language) dispatch({ type: "preferences/changed", patch: { language } });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.settings.title} labelledById="settings-title">
      <div ref={cookiesGroup} className={`${styles.group} ${focusCookies ? styles.highlight : ""}`}>
        <p className={styles.label}>{t.settings.cookies}</p>
        <div className={styles.body}>
          <div className={styles.cell}>
            <span className={styles.cellLabel}>
              <span className={`${styles.cellIcon} ${cookies?.present ? styles.green : styles.gray}`}>
                <Icon name="cookie" size={16} />
              </span>
              <span>{cookies?.present ? t.settings.cookiesLoaded(cookies.domains.join(", "), daysUntil(cookies.expires_at)) : t.settings.cookiesNone}</span>
            </span>
            {cookies?.present ? (
              <Capsule variant="destructive" onClick={() => void commands.removeCookies()}>
                {t.settings.cookiesRemove}
              </Capsule>
            ) : (
              <label className={styles.fileButton}>
                {t.settings.cookiesChoose}
                <input type="file" accept=".txt,text/plain" className="visually-hidden" aria-label={t.settings.cookiesChoose} onChange={chooseCookies} />
              </label>
            )}
          </div>
        </div>
        <p className={styles.note}>{t.settings.cookiesNote}</p>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>{t.settings.downloads}</p>
        <div className={styles.body}>
          <div className={styles.cellStack}>
            <span>{t.settings.retention}</span>
            <Segmented<(typeof RETENTION_CHOICES)[number]> label={t.settings.retention} value={retentionValue} onChange={(minutes) => void commands.saveSettings({ retention_minutes: Number(minutes) })} options={RETENTION_CHOICES.map((minutes) => ({ value: minutes, label: t.time.retention[minutes] }))} />
          </div>
          <div className={styles.cell}>
            <span>{t.settings.concurrency}</span>
            <Stepper value={settings?.max_concurrent ?? 3} min={1} max={5} decreaseLabel={t.settings.decrease} increaseLabel={t.settings.increase} onChange={(value) => void commands.saveSettings({ max_concurrent: value })} />
          </div>
          <div className={styles.cell}>
            <label htmlFor="default-format">{t.settings.defaultFormat}</label>
            <select id="default-format" className={styles.select} value={preferences.defaultFormat} onChange={(event) => chooseDefaultFormat(event.target.value)}>
              {DEFAULT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {t.settings.defaultFormats[format]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>{t.settings.appearance}</p>
        <div className={styles.body}>
          <div className={styles.cellStack}>
            <Segmented<ThemePreference>
              label={t.settings.theme}
              value={preferences.theme}
              onChange={(theme) => dispatch({ type: "preferences/changed", patch: { theme } })}
              options={[
                { value: "system", label: t.settings.themeSystem },
                { value: "light", label: t.settings.themeLight },
                { value: "dark", label: t.settings.themeDark },
              ]}
            />
          </div>
          <div className={styles.cell}>
            <span>{t.settings.accent}</span>
            <div className={styles.swatches} role="radiogroup" aria-label={t.settings.accent}>
              {ACCENTS.map((accent) => (
                <button key={accent.id} type="button" role="radio" aria-checked={preferences.accent === accent.id} aria-label={t.settings.accents[accent.id]} className={styles.swatch} style={{ background: accent.swatch, color: accent.swatch }} onClick={() => dispatch({ type: "preferences/changed", patch: { accent: accent.id } })} />
              ))}
            </div>
          </div>
          <div className={styles.cell}>
            <label htmlFor="language">{t.settings.language}</label>
            <select id="language" className={styles.select} value={preferences.language} onChange={(event) => chooseLanguage(event.target.value)}>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {t.settings.languages[language]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>{t.settings.access}</p>
        <div className={styles.body}>
          <div className={styles.cell}>
            <span className={styles.cellLabel}>
              <span className={`${styles.cellIcon} ${styles.gray}`}>
                <Icon name="lock" size={16} />
              </span>
              <span>{session?.auth_required ? t.settings.passwordOn : t.settings.passwordOff}</span>
            </span>
            {session?.auth_required ? (
              <Capsule variant="destructive" icon="signOut" onClick={() => void commands.signOut()}>
                {t.settings.signOut}
              </Capsule>
            ) : null}
          </div>
        </div>
        {session?.auth_required ? null : <p className={styles.note}>{t.settings.passwordNote}</p>}
      </div>

      <div className={styles.group}>
        <p className={styles.label}>{t.settings.storage}</p>
        <div className={styles.body}>
          <div className={styles.cellStack}>
            <span>{storageText(storage, t, locale)}</span>
            <span className={styles.storageBar} aria-hidden="true">
              <span style={{ width: `${storagePercent(storage)}%` }} />
            </span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
```

`settings.module.css`: port the prototype `.group*`, `.cell*`, `.cell-icon` (with `.green` and `.gray` variants), `.select`, `.swatches`, `.swatch` (with `[aria-checked="true"]` ring using `currentColor`), `.stepper` pieces from `components.css`, `.storage-bar` from `layout.css` (single fill using `var(--accent)`), `.group.is-highlighted` animation as `.highlight`, and `.fileButton` styled as the tinted capsule.

- [ ] **Step 5: Implement sign-in**

`apps/web/src/components/auth/LoginScreen.tsx`:

```tsx
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { BrandMark } from "../controls/BrandMark";
import { Capsule } from "../controls/Capsule";
import styles from "./auth.module.css";

export function LoginScreen(): ReactNode {
  const { t } = useI18n();
  const { commands } = useStore();
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    const signedIn = await commands.signIn(password);
    setBusy(false);
    setFailed(!signedIn);
    if (signedIn) void commands.loadServerState();
  };

  return (
    <main className={styles.screen}>
      <form className={`${styles.card} ${failed ? styles.shake : ""}`} onSubmit={(event) => void submit(event)}>
        <BrandMark size={48} />
        <h1>{t.auth.title}</h1>
        <label className={styles.field}>
          <span>{t.auth.password}</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {failed ? (
          <p role="alert" className={styles.error}>
            {t.auth.wrong}
          </p>
        ) : null}
        <Capsule type="submit" variant="primary" size="large" disabled={busy || password === ""}>
          {t.auth.submit}
        </Capsule>
      </form>
    </main>
  );
}
```

`auth.module.css`: full-height centered layout on `var(--window)`, card on `var(--grouped)` with `--radius-panel`, field styled like the prototype importer field, `.shake` using the `shake` keyframes from globals, `.error` in `var(--red-text)`.

- [ ] **Step 6: Implement PWA assets**

`apps/web/src/lib/brand.ts`:

```ts
import { LOGO_FRAME_PATH, LOGO_WAVE_PATH } from "@/components/controls/BrandMark";

export const BRAND_TEAL = "#12939c";
export const BRAND_INK = "#15181d";
export const BRAND_MIST = "#eef0f3";
export const PWA_ICON_SIZES = [192, 512] as const;

export function brandSvg({ frame, wave, background }: { frame: string; wave: string; background?: string }): string {
  const plate = background ? `<rect width="64" height="64" rx="14" fill="${background}"/>` : "";
  const scale = background ? ` transform="translate(9.6 9.6) scale(0.7)"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${plate}<g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"${scale}><path stroke="${frame}" d="${LOGO_FRAME_PATH}"/><path stroke="${wave}" d="${LOGO_WAVE_PATH}"/></g></svg>`;
}
```

Because `BrandMark.tsx` is a component module, move `LOGO_FRAME_PATH` and `LOGO_WAVE_PATH` into `brand.ts` and import them into `BrandMark.tsx` instead, so the route handlers do not import a CSS module.

`apps/web/src/app/icon.svg`: copy `/tmp/claude-1000/-home-ttndev-workspace-playground-openmedia/f044fd99-123a-4570-90dc-70fb559509d9/scratchpad/logo/assets/favicon.svg` unchanged (teal wave, dark-mode aware frame).

`apps/web/src/app/pwa-icon/[size]/route.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { BRAND_INK, BRAND_MIST, BRAND_TEAL, PWA_ICON_SIZES, brandSvg } from "@/lib/brand";

export const dynamic = "force-static";

export function generateStaticParams(): Array<{ size: string }> {
  return PWA_ICON_SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }): Promise<Response> {
  const { size } = await context.params;
  const pixels = PWA_ICON_SIZES.find((candidate) => String(candidate) === size) ?? PWA_ICON_SIZES[1];
  const source = `data:image/svg+xml;base64,${Buffer.from(brandSvg({ frame: BRAND_MIST, wave: BRAND_TEAL, background: BRAND_INK })).toString("base64")}`;
  return new ImageResponse(<img src={source} width={pixels} height={pixels} alt="" />, { width: pixels, height: pixels });
}
```

`apps/web/src/app/apple-icon.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { BRAND_INK, BRAND_MIST, BRAND_TEAL, brandSvg } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
  const source = `data:image/svg+xml;base64,${Buffer.from(brandSvg({ frame: BRAND_MIST, wave: BRAND_TEAL, background: BRAND_INK })).toString("base64")}`;
  return new ImageResponse(<img src={source} width={180} height={180} alt="" />, size);
}
```

Disable `@next/next/no-img-element` for these two files in `eslint.config.mjs` (the same entry used for `Thumbnail.tsx`, extended with `src/app/apple-icon.tsx` and `src/app/pwa-icon/**`), because `ImageResponse` renders plain `img` elements.

`apps/web/src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";
import { BRAND_TEAL } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenMedia",
    short_name: "OpenMedia",
    description: "Download videos from almost any website. Lightweight, self-hosted media downloader with a clean web UI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: BRAND_TEAL,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: { action: "/", method: "GET", params: { url: "url", text: "text", title: "title" } },
  };
}
```

If `MetadataRoute.Manifest` in Next 16.3 does not type `share_target`, extend the returned object type locally: `type ShareableManifest = MetadataRoute.Manifest & { share_target: { action: string; method: "GET"; params: Record<string, string> } }` and use it as the return type.

- [ ] **Step 7: Run the web checks and commit**

Run from the project root: `mise run //apps/web:ci-unit`
Expected: PASS.

```bash
git add apps/web
git commit -m "feat(web): add history, settings, password sign-in and installable PWA assets"
```

### Task 13: Application shell, importer and page

**Files:**

- Create: `apps/web/src/components/shell/AppShell.tsx`, `apps/web/src/components/shell/Sidebar.tsx`, `apps/web/src/components/shell/Toolbar.tsx`, `apps/web/src/components/shell/TabBar.tsx`, `apps/web/src/components/shell/useShortcuts.ts`, `apps/web/src/components/shell/shell.module.css`
- Create: `apps/web/src/components/importer/Importer.tsx`, `apps/web/src/components/importer/Importer.test.tsx`, `apps/web/src/components/importer/importer.module.css`
- Create: `apps/web/src/app/OpenMediaClient.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**

- Consumes: everything from Tasks 8 to 12.
- Produces: `AppShell()`, `Sidebar({ onOpenSettings, onNavigate })`, `Toolbar({ scrolled, title, onToggleSidebar, sidebarOpen, onOpenShortcuts })`, `TabBar({ onOpenSettings })`, `Importer({ value, onChange, onSubmit, scope, onScopeChange, inputRef })`, `useShortcuts({ inputRef, onShortcuts, onEscape })`, `OpenMediaClient()`.

- [ ] **Step 1: Write the failing importer test**

`apps/web/src/components/importer/Importer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { PlaylistScope } from "@/state/types";
import { Importer } from "./Importer";

function Harness({ onSubmit }: { onSubmit: (urls: string[], scope: PlaylistScope) => void }): ReactNode {
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<PlaylistScope>("single");
  return <Importer value={value} onChange={setValue} onSubmit={onSubmit} scope={scope} onScopeChange={setScope} inputRef={createRef()} />;
}

describe("Importer", () => {
  it("detects platforms, asks about playlists and submits on Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    const field = screen.getByLabelText("Links to download");
    await user.type(field, "https://www.youtube.com/watch?v=a&list=PL1 https://soundcloud.com/a/b");
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("SoundCloud")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Whole playlist (up to 50 videos)" }));
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith(["https://www.youtube.com/watch?v=a&list=PL1", "https://soundcloud.com/a/b"], "playlist");
  });

  it("keeps Shift+Enter as a new line", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Links to download"), "https://youtu.be/a{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

The playlist label uses the server limit; with no session loaded the importer passes `50`, the API default.

- [ ] **Step 2: Implement the importer**

`apps/web/src/components/importer/Importer.tsx`:

```tsx
"use client";

import { useLayoutEffect, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { detectPlatforms, hasPlaylist, parseLinks, type PlatformId } from "@/lib/links";
import type { PlaylistScope } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import { Icon, type IconName } from "../controls/Icon";
import { Segmented } from "../controls/Segmented";
import styles from "./importer.module.css";

const MAX_FIELD_HEIGHT = 132;
const DEFAULT_PLAYLIST_LIMIT = 50;
const PLATFORM_LABELS: Record<PlatformId, { label: string; icon: IconName }> = {
  youtube: { label: "YouTube", icon: "youtube" },
  tiktok: { label: "TikTok", icon: "tiktok" },
  instagram: { label: "Instagram", icon: "instagram" },
  soundcloud: { label: "SoundCloud", icon: "soundcloud" },
  x: { label: "X", icon: "xLogo" },
  facebook: { label: "Facebook", icon: "facebook" },
  vimeo: { label: "Vimeo", icon: "vimeo" },
  other: { label: "Web", icon: "globe" },
};

interface ImporterProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (urls: string[], scope: PlaylistScope) => void;
  scope: PlaylistScope;
  onScopeChange: (scope: PlaylistScope) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  playlistLimit?: number;
  onInvalid?: () => void;
  onClipboardDenied?: () => void;
}

export function Importer({ value, onChange, onSubmit, scope, onScopeChange, inputRef, playlistLimit = DEFAULT_PLAYLIST_LIMIT, onInvalid, onClipboardDenied }: ImporterProps): ReactNode {
  const { t } = useI18n();
  const links = parseLinks(value);
  const platforms = detectPlatforms(links);
  const showPlaylistChoice = links.some(hasPlaylist);

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }, [value, inputRef]);

  const submit = (): void => {
    if (links.length === 0) {
      onInvalid?.();
      return;
    }
    onSubmit(links, scope);
  };

  const pasteFromClipboard = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      onChange([value.trim(), text.trim()].filter(Boolean).join("\n"));
    } catch {
      onClipboardDenied?.();
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className={styles.importer}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <label className="visually-hidden" htmlFor="links">
        {t.importer.label}
      </label>
      <div className={styles.field}>
        <Icon name="link" size={18} />
        <textarea id="links" ref={inputRef} rows={1} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown} placeholder={t.importer.placeholder} autoComplete="off" spellCheck={false} aria-describedby="importer-hint" />
        <button type="button" className={styles.paste} onClick={() => void pasteFromClipboard()}>
          <Icon name="clipboard" size={16} />
          <span>{t.importer.paste}</span>
        </button>
      </div>
      <Capsule type="submit" variant="primary" size="large" className={styles.submit} disabled={value.trim() === ""}>
        {t.importer.fetch}
      </Capsule>
      {platforms.length > 0 ? (
        <div className={styles.chips} aria-live="polite">
          {platforms.map((platform) => (
            <span key={platform} className={styles.chip}>
              <Icon name={PLATFORM_LABELS[platform].icon} size={14} />
              {PLATFORM_LABELS[platform].label}
            </span>
          ))}
        </div>
      ) : null}
      {showPlaylistChoice ? (
        <div className={styles.playlist}>
          <p>{t.importer.playlistPrompt}</p>
          <Segmented<PlaylistScope>
            label={t.importer.playlistPrompt}
            value={scope}
            onChange={onScopeChange}
            options={[
              { value: "single", label: t.importer.playlistSingle },
              { value: "playlist", label: t.importer.playlistAll(playlistLimit) },
            ]}
          />
        </div>
      ) : null}
      <p id="importer-hint" className={styles.hint}>
        {t.importer.hint}
      </p>
    </form>
  );
}
```

`importer.module.css`: port the prototype `.importer`, `.field` (including `.is-shaking` as `.shaking`), `.field-icon`, `.field textarea`, `.field-paste` (as `.paste`), `.importer-submit` (as `.submit`), `.importer-meta` (as `.chips`), `.platform-chip` (as `.chip`), `.playlist-choice` (as `.playlist`), `.importer-hint` (as `.hint`) and their phone overrides.

- [ ] **Step 3: Implement the shell**

`apps/web/src/components/shell/useShortcuts.ts`:

```ts
"use client";

import { useEffect, type RefObject } from "react";

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

export function useShortcuts({ inputRef, onShortcuts }: { inputRef: RefObject<HTMLTextAreaElement | null>; onShortcuts: () => void }): void {
  useEffect(() => {
    const handle = (event: KeyboardEvent): void => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === "?") {
        event.preventDefault();
        onShortcuts();
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [inputRef, onShortcuts]);
}
```

`apps/web/src/components/shell/AppShell.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { linkFromShare, parseLinks } from "@/lib/links";
import { useStore } from "@/state/StoreProvider";
import type { PlaylistScope } from "@/state/types";
import { LoginScreen } from "../auth/LoginScreen";
import { IconButton } from "../controls/IconButton";
import { HistoryView } from "../history/HistoryView";
import { Importer } from "../importer/Importer";
import { Inspector } from "../inspector/Inspector";
import { AlertDialog } from "../overlays/AlertDialog";
import { DropOverlay } from "../overlays/DropOverlay";
import { Island } from "../overlays/Island";
import { ShortcutsHud } from "../overlays/ShortcutsHud";
import { QueueView } from "../queue/QueueView";
import { SettingsSheet } from "../settings/SettingsSheet";
import styles from "./shell.module.css";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { Toolbar } from "./Toolbar";
import { useShortcuts } from "./useShortcuts";

function takeSharedLink(): string | null {
  const params = new URLSearchParams(window.location.search);
  const link = linkFromShare({ url: params.get("url"), text: params.get("text") });
  if (params.size > 0) window.history.replaceState(null, "", window.location.pathname);
  return link;
}

export function AppShell(): ReactNode {
  const { t } = useI18n();
  const { state, dispatch, commands } = useStore();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [linkText, setLinkText] = useState("");
  const [scope, setScope] = useState<PlaylistScope>("single");
  const [scrolled, setScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusCookies, setFocusCookies] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clearAlertOpen, setClearAlertOpen] = useState(false);
  const [inspectorSheetOpen, setInspectorSheetOpen] = useState(false);

  const submitLinks = useCallback(
    (urls: readonly string[], chosenScope: PlaylistScope): void => {
      setLinkText("");
      dispatch({ type: "view/changed", view: "queue", filter: "all" });
      void commands.fetchLinks(urls, chosenScope);
    },
    [commands, dispatch],
  );

  useEffect(() => {
    const shared = takeSharedLink();
    if (shared) submitLinks([shared], "single");
  }, [submitLinks]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { root: scroller.current, rootMargin: "-52px 0px 0px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pasteAnywhere = (event: ClipboardEvent): void => {
      const target = event.target;
      const typing = target instanceof HTMLElement && target.closest("input, textarea, select") !== null;
      const text = event.clipboardData?.getData("text") ?? "";
      if (typing || parseLinks(text).length === 0) return;
      event.preventDefault();
      submitLinks(parseLinks(text), "single");
    };
    document.addEventListener("paste", pasteAnywhere);
    return () => document.removeEventListener("paste", pasteAnywhere);
  }, [submitLinks]);

  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useShortcuts({ inputRef, onShortcuts: openShortcuts });

  const openSettings = (cookies = false): void => {
    setFocusCookies(cookies);
    setInspectorSheetOpen(false);
    setSettingsOpen(true);
  };

  if (state.session?.auth_required && !state.session.authenticated) return <LoginScreen />;

  const title = state.view === "history" ? t.history.title : { all: t.nav.queue, active: t.nav.downloading, done: t.nav.done, error: t.nav.attention }[state.filter];

  return (
    <div className={styles.app} data-sidebar-open={sidebarOpen} data-scrolled={scrolled}>
      <Sidebar onOpenSettings={() => openSettings()} onNavigate={() => setSidebarOpen(false)} />
      <main className={styles.content}>
        <Toolbar scrolled={scrolled} title={title} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((open) => !open)} onOpenShortcuts={openShortcuts} />
        <div ref={scroller} className={styles.scroller}>
          <div className={styles.page}>
            <div className={styles.largeTitle}>
              <h1>{title}</h1>
            </div>
            <div ref={sentinel} className={styles.sentinel} aria-hidden="true" />
            <Importer value={linkText} onChange={setLinkText} onSubmit={submitLinks} scope={scope} onScopeChange={setScope} inputRef={inputRef} playlistLimit={state.session?.limits.max_playlist_items} onInvalid={() => commands.notify({ tone: "info", message: "noLinks" })} onClipboardDenied={() => commands.notify({ tone: "info", message: "pasteFallback" })} />
            {isPhone && !state.preferences.installHintDismissed ? (
              <div className={styles.installBanner}>
                <p>{t.importer.installHint}</p>
                <IconButton label={t.importer.dismissInstallHint} icon="x" size="small" onClick={() => dispatch({ type: "preferences/changed", patch: { installHintDismissed: true } })} />
              </div>
            ) : null}
            {state.view === "history" ? <HistoryView onClearRequest={() => setClearAlertOpen(true)} /> : <QueueView onOpenItem={() => setInspectorSheetOpen(true)} onOpenCookies={() => openSettings(true)} />}
          </div>
        </div>
      </main>
      <Inspector sheetOpen={inspectorSheetOpen} onCloseSheet={() => setInspectorSheetOpen(false)} onOpenCookies={() => openSettings(true)} />
      {isPhone ? <TabBar onOpenSettings={() => openSettings()} /> : null}
      {sidebarOpen ? <button type="button" className={styles.sidebarScrim} aria-label={t.shortcuts.dismiss} onClick={() => setSidebarOpen(false)} /> : null}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} focusCookies={focusCookies} />
      <ShortcutsHud open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AlertDialog
        open={clearAlertOpen}
        title={t.history.clearTitle}
        message={t.history.clearMessage}
        confirmLabel={t.history.clearConfirm}
        cancelLabel={t.history.cancel}
        destructive
        onConfirm={() => {
          dispatch({ type: "history/cleared" });
          setClearAlertOpen(false);
        }}
        onCancel={() => setClearAlertOpen(false)}
      />
      <DropOverlay onDrop={(text) => setLinkText((current) => [current.trim(), text.trim()].filter(Boolean).join("\n"))} />
      <Island />
    </div>
  );
}
```

`Sidebar.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { countItems } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import type { Filter } from "@/state/types";
import { BrandMark } from "../controls/BrandMark";
import { Icon, type IconName } from "../controls/Icon";
import { IconButton } from "../controls/IconButton";
import styles from "./shell.module.css";

const FILTER_ITEMS: ReadonlyArray<{ filter: Filter; icon: IconName; label: "queue" | "downloading" | "done" | "attention" }> = [
  { filter: "all", icon: "queue", label: "queue" },
  { filter: "active", icon: "arrowDown", label: "downloading" },
  { filter: "done", icon: "checkCircle", label: "done" },
  { filter: "error", icon: "warningCircle", label: "attention" },
];

export function Sidebar({ onOpenSettings, onNavigate }: { onOpenSettings: () => void; onNavigate: () => void }): ReactNode {
  const { t, locale } = useI18n();
  const { state, dispatch } = useStore();
  const counts = countItems(state);
  const go = (view: "queue" | "history", filter: Filter = state.filter): void => {
    dispatch({ type: "view/changed", view, filter });
    onNavigate();
  };
  const storage = state.storage;
  const usedPercent = storage ? Math.min(100, (storage.used_bytes / (storage.limit_bytes ?? storage.used_bytes + storage.free_bytes)) * 100) : 0;
  return (
    <aside className={styles.sidebar} aria-label={t.nav.downloads}>
      <div className={styles.sidebarPanel}>
        <div className={styles.brand}>
          <BrandMark />
          <span className={styles.brandName}>OpenMedia</span>
        </div>
        <nav className={styles.sourceList}>
          <p className={styles.sourceHeading}>{t.nav.downloads}</p>
          {FILTER_ITEMS.map((item) => (
            <button key={item.filter} type="button" className={styles.sourceItem} aria-current={state.view === "queue" && state.filter === item.filter} onClick={() => go("queue", item.filter)}>
              <Icon name={item.icon} size={17} />
              <span>{t.nav[item.label]}</span>
              <span className={styles.count}>{counts[item.filter] || ""}</span>
            </button>
          ))}
          <p className={styles.sourceHeading}>{t.nav.other}</p>
          <button type="button" className={styles.sourceItem} aria-current={state.view === "history"} onClick={() => go("history")}>
            <Icon name="history" size={17} />
            <span>{t.nav.history}</span>
            <span className={styles.count}>{state.history.length || ""}</span>
          </button>
          <button type="button" className={styles.sourceItem} onClick={onOpenSettings}>
            <Icon name="gear" size={17} />
            <span>{t.nav.settings}</span>
            <span />
          </button>
        </nav>
        <div className={styles.sidebarFoot}>
          {state.preferences.installHintDismissed ? null : (
            <div className={styles.installCard}>
              <Icon name="deviceMobile" size={16} />
              <p>{t.importer.installHint}</p>
              <IconButton label={t.importer.dismissInstallHint} icon="x" size="small" onClick={() => dispatch({ type: "preferences/changed", patch: { installHintDismissed: true } })} />
            </div>
          )}
          {storage ? (
            <div className={styles.storage}>
              <div className={styles.storageLine}>
                <span>{t.settings.storage}</span>
                <span>{formatBytes(storage.used_bytes, locale)}</span>
              </div>
              <span className={styles.storageBar} aria-hidden="true">
                <span style={{ width: `${usedPercent}%` }} />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
```

`Toolbar.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { BrandMark } from "../controls/BrandMark";
import { IconButton } from "../controls/IconButton";
import styles from "./shell.module.css";

interface ToolbarProps {
  scrolled: boolean;
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenShortcuts: () => void;
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function Toolbar({ scrolled, title, sidebarOpen, onToggleSidebar, onOpenShortcuts }: ToolbarProps): ReactNode {
  const { t } = useI18n();
  const { state, dispatch } = useStore();
  const isDark = state.preferences.theme === "dark" || (state.preferences.theme === "system" && prefersDark());
  const toggleTheme = (): void => {
    const apply = (): void => dispatch({ type: "preferences/changed", patch: { theme: isDark ? "light" : "dark" } });
    if (typeof document.startViewTransition === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
    else apply();
  };
  return (
    <header className={styles.toolbar} data-scrolled={scrolled}>
      <IconButton className={styles.sidebarToggle} label={t.nav.showSidebar} icon="list" aria-expanded={sidebarOpen} onClick={onToggleSidebar} />
      <span className={styles.toolbarBrand}>
        <BrandMark size={22} />
      </span>
      <p className={styles.toolbarTitle} aria-hidden="true">
        {title}
      </p>
      <div className={styles.toolbarActions}>
        <IconButton label={t.nav.toggleTheme} icon={isDark ? "sun" : "moon"} onClick={toggleTheme} />
        <IconButton className={styles.shortcutsButton} label={t.nav.shortcuts} icon="keyboard" onClick={onOpenShortcuts} />
      </div>
    </header>
  );
}
```

`TabBar.tsx`:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { Icon } from "../controls/Icon";
import styles from "./shell.module.css";

export function TabBar({ onOpenSettings }: { onOpenSettings: () => void }): ReactNode {
  const { t } = useI18n();
  const { state, dispatch } = useStore();
  const index = state.view === "history" ? 1 : 0;
  return (
    <nav className={styles.tabbar} aria-label={t.nav.downloads} style={{ "--tab-index": index } as CSSProperties}>
      <span className={styles.tabThumb} aria-hidden="true" />
      <button type="button" className={styles.tab} aria-current={state.view === "queue" ? "page" : undefined} onClick={() => dispatch({ type: "view/changed", view: "queue", filter: "all" })}>
        <Icon name="queue" size={22} />
        <span>{t.nav.queue}</span>
      </button>
      <button type="button" className={styles.tab} aria-current={state.view === "history" ? "page" : undefined} onClick={() => dispatch({ type: "view/changed", view: "history" })}>
        <Icon name="history" size={22} />
        <span>{t.nav.history}</span>
      </button>
      <button type="button" className={styles.tab} onClick={onOpenSettings}>
        <Icon name="gear" size={22} />
        <span>{t.nav.settings}</span>
      </button>
    </nav>
  );
}
```

`shell.module.css`: port the prototype `layout.css` (`.app`, `.sidebar`, `.sidebar-panel`, `.brand`, `.brand-name` using `var(--font-brand)`, `.source-list`, `.source-heading`, `.source-item` with `[aria-current="true"]`, `.source-count` as `.count`, `.sidebar-foot`, `.install-card`, `.storage*`, `.content`, `.toolbar` with `[data-scrolled="true"]` for `.app.is-scrolled .toolbar`, `.toolbar-*`, `.scroller`, `.page`, `.large-title`, `.title-sentinel` as `.sentinel`, `.tabbar`, `.tabbar-thumb` as `.tabThumb`, `.tab`), the install banner from `components.css` as `.installBanner`, `.app[data-sidebar-open="true"] .sidebar` for `.app.sidebar-open .sidebar`, a `.sidebarScrim` button (fixed, `var(--scrim)`, visible from 768 to 1023 px only), and the phone page scale `body[data-sheet-open="true"] .content` with the prototype `.app.sheet-behind .content` values. On phones the grid has one column and the inspector column is not rendered because `Inspector` returns a `Sheet`.

- [ ] **Step 4: Mount the application in the browser only**

`apps/web/src/app/OpenMediaClient.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ClientApp = dynamic(
  async () => {
    const [{ StoreProvider }, { AppShell }] = await Promise.all([import("@/state/StoreProvider"), import("@/components/shell/AppShell")]);
    return function OpenMediaApp(): ReactNode {
      return (
        <StoreProvider>
          <AppShell />
        </StoreProvider>
      );
    };
  },
  { ssr: false },
);

export function OpenMediaClient(): ReactNode {
  return <ClientApp />;
}
```

`apps/web/src/app/page.tsx`:

```tsx
import type { ReactNode } from "react";
import { OpenMediaClient } from "./OpenMediaClient";

export default function Home(): ReactNode {
  return <OpenMediaClient />;
}
```

- [ ] **Step 5: Run everything and look at the app**

Run from the project root: `mise run //apps/web:ci-unit` then `mise run //apps/web:build`.
Expected: PASS and a successful production build.

Start both apps (`mise run //apps/api:dev` and `mise run //apps/web:dev` in two terminals), open `http://localhost:3000`, paste `https://www.youtube.com/watch?v=jNQXAC9IVRw`, get info, download as MP4, save the file, switch to audio, trim, open settings, change the accent, toggle dark mode, resize to 390 px and open the inspector sheet. Fix anything that does not match the prototype's behavior.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): assemble the OpenMedia shell with sidebar, toolbar, tab bar and importer"
```

### Task 14: Brand assets, licensing, README and documentation site

**Files:**

- Create: `LICENSE`, `NOTICE`, `README.vi.md`, `docs/configuration.md`, `docs/usage.md`, `docs/troubleshooting.md`, `docs/security.md`, `docs/public/logo.svg`, `docs/public/brand/logo-full.svg`, `docs/public/brand/logo-white.svg`, `docs/public/brand/logo-icon.svg`, `docs/decisions/0001-keep-and-patch-the-reclip-backend.md`, `docs/decisions/0002-proxy-the-api-through-the-web-origin.md`, `docs/decisions/0003-keep-jobs-in-memory-with-one-worker.md`, `docs/decisions/0004-store-history-in-the-browser.md`, `docs/decisions/0005-apple-style-design-system.md`
- Modify: `README.md`, `docs/index.md`, `docs/getting-started.md`, `docs/deployment.md`, `docs/.vitepress/config.ts`, `docs/scripts/check-paths.mjs`, `CONTRIBUTING.md`, `SECURITY.md`
- Delete: `docs/public/logo.png`

**Interfaces:**

- Consumes: logo assets, spec sections 4.2 (configuration), 4.3 (API), 4.7 (security).
- Produces: `mise run //docs:ci-unit` green; README sections in the escrcpy order.

- [ ] **Step 1: Copy brand assets**

Copy from `/tmp/claude-1000/-home-ttndev-workspace-playground-openmedia/f044fd99-123a-4570-90dc-70fb559509d9/scratchpad/logo/assets/`: `logo-mark.svg` to `docs/public/logo.svg`, `logo-full.svg`, `logo-white.svg`, `logo-icon.svg` to `docs/public/brand/`. Delete `docs/public/logo.png`.

- [ ] **Step 2: Licensing**

`LICENSE`: the MIT license text with `Copyright (c) 2026 OpenMedia contributors`.

`NOTICE`:

```text
OpenMedia
Copyright (c) 2026 OpenMedia contributors

This product is a rebuild of ReClip (https://github.com/averygan/reclip),
released under the MIT License:

  MIT License
  Copyright (c) 2026 ReClip authors

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

Third-party tools used at runtime: yt-dlp (Unlicense), FFmpeg (LGPL/GPL),
Deno (MIT), Next.js (MIT), Flask (BSD-3-Clause), Phosphor Icons (MIT).
```

- [ ] **Step 3: README in the escrcpy structure**

`README.md` must contain, in this order:

1. A centered header block:

```html
<div align="center">
  <img src="docs/public/logo.svg" alt="OpenMedia" width="96" />
  <h1>OpenMedia</h1>
  <p>Download videos from almost any website. Lightweight, self-hosted media downloader with a clean web UI.</p>
  <p>
    <a href="https://github.com/ttncode/openmedia/actions/workflows/ci.yml"><img src="https://github.com/ttncode/openmedia/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://github.com/ttncode/openmedia/releases"><img src="https://img.shields.io/github/v/release/ttncode/openmedia?color=12939c" alt="Release" /></a>
    <a href="https://github.com/ttncode/openmedia/stargazers"><img src="https://img.shields.io/github/stars/ttncode/openmedia?style=flat&color=12939c" alt="Stars" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-12939c" alt="MIT license" /></a>
  </p>
  <p>English | <a href="README.vi.md">Tiếng Việt</a></p>
</div>
```

2. `## Features`: a bullet list (no emoji) covering 1000+ sites via yt-dlp; MP4 and MKV video with a quality picker; MP3, M4A, Opus, FLAC and WAV audio; trimming to a time range; subtitles embedded or as SRT; cover art, metadata and chapters; a queue with live progress, cancel and a concurrency limit; bulk links and playlists; cookies for age-restricted or bot-checked videos; optional password, rate limiting and private-network blocking; history, drag and drop, paste anywhere, keyboard shortcuts; installable PWA with a share target; light and dark themes with seven accent colors; English and Vietnamese.
3. A centered preview image: `docs/public/screenshots/desktop-light.png` with `docs/public/screenshots/phone-dark.png` beside it (created in Task 15).
4. `## Installation` with `### Docker Compose` (download `compose.yaml` and `example.env` from the latest release, copy `example.env` to `.env`, `docker compose up -d`, open `http://localhost:8080`), `### Installer script` (`curl -fsSL https://github.com/ttncode/openmedia/releases/latest/download/install.sh | sh`), `### From source` (clone, `mise install`, `mise run //apps/api:dev`, `mise run //apps/web:dev`, open `http://localhost:3000`).
5. `## Documentation`: links to the docs pages created in this task (`docs/getting-started.md`, `docs/usage.md`, `docs/configuration.md`, `docs/deployment.md`, `docs/troubleshooting.md`, `docs/security.md`).
6. `## For Developers`: the task contract (`mise run checklist`, per-root `ci-unit`), project layout table (`apps/api`, `apps/web`, `docs`), link to `CONTRIBUTING.md`.
7. `## Get Help`: troubleshooting page, GitHub issues link, security policy link.
8. `## Acknowledgments`: ReClip, yt-dlp, FFmpeg, Deno, Next.js, Flask, Phosphor Icons, scaffold toolbox.
9. `## Disclaimer`: personal use, respect copyright and platform terms.
10. `## License`: MIT, see `LICENSE` and `NOTICE`.

`README.vi.md` is the same document in Vietnamese with the language switch reversed (`<a href="README.md">English</a> | Tiếng Việt`).

- [ ] **Step 4: Documentation pages**

Write each page for operators, with real commands and values from the spec:

- `docs/index.md`: VitePress home layout (`layout: home`, hero name OpenMedia, tagline, actions to getting started and configuration, feature cards for downloads, formats, privacy, install anywhere).
- `docs/getting-started.md`: requirements (Docker 24+ or mise), Compose install, first download walkthrough, updating (`docker compose pull && docker compose up -d`).
- `docs/usage.md`: pasting and dropping links, playlists, formats and quality, trimming, subtitles, queue controls, history, PWA install and share target on Android, keyboard shortcuts table.
- `docs/configuration.md`: the full variable table from spec 4.2 plus `WEB_PORT`, `API_PORT`, `IMAGE_TAG`, `API_URL`; runtime settings (retention, concurrency) and where they persist.
- `docs/deployment.md`: compose topology (web public, API on 127.0.0.1), data volume, reverse proxy example for Caddy (`reverse_proxy localhost:8080`) and nginx (with `proxy_set_header X-Forwarded-For $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header Host $host;`), `OPENMEDIA_TRUSTED_PROXY_HOPS` guidance, backups of `/data`, yt-dlp auto-update.
- `docs/troubleshooting.md`: "Sign in to confirm you're not a bot" (export cookies with a browser extension, upload in Settings), age-restricted videos, `private_network` errors and `OPENMEDIA_ALLOW_PRIVATE_URLS`, files missing after the retention period, storage full, API unreachable (check `docker compose ps`, `docker compose logs api`), slow or stalled downloads.
- `docs/security.md`: threat model for public instances, password, cross-site guard, rate limits, network guard and its redirect limitation with `OPENMEDIA_YTDLP_PROXY`, cookie file handling, running as non-root, reporting vulnerabilities.

Update `docs/.vitepress/config.ts`: `title: 'OpenMedia'`, `description` set to the GitHub description, `head` icon `/logo.svg`, `themeConfig.logo: '/logo.svg'`, sidebar groups `Guide` (Getting started, Usage, Configuration) and `Operations` (Deployment, Troubleshooting, Security), keep `srcExclude: ['superpowers/**']`.

Update `CONTRIBUTING.md` and `SECURITY.md` only where they name the project or contact path, keeping scaffold's structure.

- [ ] **Step 5: Keep process documents out of the path check**

`docs/superpowers/` holds the spec and this plan, which name files that are created later or deleted on purpose. In `docs/scripts/check-paths.mjs` change the markdown skip set to `const MARKDOWN_SKIP_DIRS = new Set([...SKIP_DIRS, "apps", "superpowers"]);`. Leave the rest of the script unchanged.

- [ ] **Step 6: ADRs**

Each ADR follows `docs/decisions/_template.md` exactly (`# NNNN — Title`, `Status: Accepted`, `Date: 2026-09-14`, sections Context, Decision, Consequences, Alternatives considered). Content:

- 0001: reclip's Flask and yt-dlp backend kept for its proven extractor coverage and endpoint compatibility; patched for command injection and extended; alternatives: rewrite in Node, verbatim copy.
- 0002: the browser talks only to the web origin, which proxies `/api/*` at runtime; no build-time API URL, first-party cookies, one public port; alternatives: `NEXT_PUBLIC_API_URL`, CORS.
- 0003: in-memory job registry with one gunicorn worker and threads; restart loses active jobs, retention cleans files; alternatives: SQLite, Redis queue.
- 0004: history and ready items in localStorage; no accounts or database; alternatives: server history table.
- 0005: Apple Human Interface style tokens, springs and materials with CSS Modules; teal accent from the logo; alternatives: Tailwind utilities only, shadcn defaults.

- [ ] **Step 7: Run the docs checks and commit**

Run from the project root: `mise run //docs:ci-unit`
Expected: PASS. README and docs pages reference screenshots only as image links (not backticks), because Task 15 creates them.

```bash
git add LICENSE NOTICE README.md README.vi.md CONTRIBUTING.md SECURITY.md docs
git commit -m "docs: add README, licensing, operator guides and architecture decisions"
```

### Task 15: Full-stack verification and screenshots

**Files:**

- Create: `docs/public/screenshots/desktop-light.png`, `docs/public/screenshots/desktop-dark.png`, `docs/public/screenshots/phone-dark.png`, `docs/public/screenshots/settings.png`
- Modify: any file needed to fix defects found here (each fix gets its own `fix:` commit)

- [ ] **Step 1: Run the whole checklist**

Run from the project root: `mise run checklist`
Expected: every root passes, including `next build` and the docs build.

- [ ] **Step 2: Build and run the production stack locally**

```bash
docker build -t ghcr.io/ttncode/openmedia-api:local apps/api
docker build -t ghcr.io/ttncode/openmedia-web:local apps/web
cp example.env .env
IMAGE_TAG=local docker compose up -d
sleep 20
docker compose ps
curl -fsS localhost:8080/api/health/live
curl -fsS localhost:8080/api/session
```

Expected: both services healthy, liveness `{"status":"ok"}` (or the adapter's payload), session JSON without authentication.

- [ ] **Step 3: Exercise real downloads through the browser**

With the stack running, open `http://localhost:8080` and verify, fixing defects as they appear:

1. Paste `https://www.youtube.com/watch?v=jNQXAC9IVRw`, get info, download MP4 1080p or best, watch progress, save the file, confirm it plays (H.264/AAC: `ffprobe` on the saved file).
2. Same video as audio M4A; confirm cover art is embedded (`ffprobe` shows an attached picture stream).
3. Trim 0:05 to 0:12; confirm duration about 7 seconds.
4. Start a long download and cancel it; the row returns to ready and the job directory disappears (`docker compose exec api ls /data/downloads`).
5. Paste a SoundCloud track link, download M4A.
6. Paste `http://127.0.0.1:8080` and confirm the private network message.
7. Set retention to 15 minutes in Settings, confirm `settings.json` in the volume; upload an invalid cookies file and confirm the error.
8. Restart with `OPENMEDIA_PASSWORD=verify` in `.env`, confirm the sign-in screen, wrong password message, then sign in.
9. Resize to 390 px: tab bar, inspector sheet drag to dismiss, settings sheet.
10. Toggle dark mode and the pink accent; the logo wave follows the accent.

- [ ] **Step 4: Capture screenshots**

With sample downloads in the queue, capture PNGs at 1440x900 (light and dark) and 390x844 (dark, inspector sheet open), plus the settings sheet, into `docs/public/screenshots/`. Keep each file under 500 KB (`pngquant` or re-capture at device scale 1).

- [ ] **Step 5: Stop the stack and commit**

```bash
IMAGE_TAG=local docker compose down
rm .env
git add docs/public/screenshots
git commit -m "docs: add screenshots from the running stack"
```

### Task 16: Pull request, merge and release

- [ ] **Step 1: Push and open the pull request**

```bash
git push -u origin feat-openmedia
gh pr create --repo ttncode/openmedia --base main --head feat-openmedia --title "feat: OpenMedia 0.1" --body-file <path to a PR body following .github/pull_request_template.md>
```

The body summarizes the features, the verification from Task 15 (with commands and results) and links the spec and plan.

- [ ] **Step 2: Wait for CI and fix failures**

Run: `gh pr checks --repo ttncode/openmedia --watch`
Expected: every check passes. Fix failures with new commits on the branch until green.

- [ ] **Step 3: Merge**

```bash
gh pr merge --repo ttncode/openmedia --squash --delete-branch
```

- [ ] **Step 4: Release**

Wait for the Release Please pull request (`gh pr list --repo ttncode/openmedia --label "autorelease: pending"`), then merge it with `gh pr merge <number> --squash`. Confirm with `gh release view --repo ttncode/openmedia` that the release lists `compose.yaml`, `example.env` and `install.sh`, and that the build workflow pushed `ghcr.io/ttncode/openmedia-web` and `ghcr.io/ttncode/openmedia-api`. If the first release version is not `0.1.0`, record the version it chose.

- [ ] **Step 5: Smoke-test the released images**

```bash
mkdir -p /tmp/openmedia-release && cd /tmp/openmedia-release
gh release download --repo ttncode/openmedia --pattern compose.yaml --pattern example.env
cp example.env .env
docker compose up -d
sleep 25
curl -fsS localhost:8080/api/session
docker compose down -v
```

Expected: session JSON from the released images.
