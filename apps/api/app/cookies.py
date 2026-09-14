import re
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from .errors import ApiError
from .private_files import write_private_text

COOKIE_COPY_NAME = ".cookies.txt"
MAX_COOKIE_BYTES = 1024 * 1024
HTTP_ONLY_PREFIX = "#HttpOnly_"
COOKIE_FIELD_COUNT = 7
EXPIRY_FIELD = 4
EXPIRY_PATTERN = re.compile(r"[0-9]+")
MAX_REPRESENTABLE_EXPIRY = int(datetime.max.replace(tzinfo=UTC).timestamp())


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


EMPTY_SUMMARY = CookieSummary(
    present=False, domains=(), expires_at=None, uploaded_at=None
)


def parse_cookie_rows(text: str) -> list[CookieRow]:
    rows = []
    for raw_line in text.splitlines():
        line = raw_line.removeprefix(HTTP_ONLY_PREFIX)
        if not line.strip() or line.startswith("#"):
            continue
        fields = line.split("\t")
        if len(fields) == COOKIE_FIELD_COUNT and EXPIRY_PATTERN.fullmatch(
            fields[EXPIRY_FIELD]
        ):
            rows.append(
                CookieRow(
                    domain=fields[0].lstrip("."), expires=int(fields[EXPIRY_FIELD])
                )
            )
    return rows


def validate_cookie_file(raw: bytes) -> str:
    if len(raw) > MAX_COOKIE_BYTES:
        raise ApiError(
            413, "invalid_cookies", "The cookie file must be 1 MB or smaller."
        )
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ApiError(
            400, "invalid_cookies", "The cookie file must be UTF-8 text."
        ) from error
    if not parse_cookie_rows(text):
        raise ApiError(
            400, "invalid_cookies", "This is not a cookies.txt file in Netscape format."
        )
    return text


def summarize_cookies(text: str, uploaded_at: datetime) -> CookieSummary:
    rows = parse_cookie_rows(text)
    expiries = [
        row.expires for row in rows if 0 < row.expires <= MAX_REPRESENTABLE_EXPIRY
    ]
    expires_at = datetime.fromtimestamp(max(expiries), UTC) if expiries else None
    return CookieSummary(
        True, tuple(sorted({row.domain for row in rows})), expires_at, uploaded_at
    )


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
            write_private_text(temporary, text)
            temporary.replace(self._path)
        return self.summary()

    def delete(self) -> None:
        with self._lock:
            self._path.unlink(missing_ok=True)

    def copy_into(self, directory: Path) -> Path | None:
        with self._lock:
            if not self._path.is_file():
                return None
            text = self._path.read_text(encoding="utf-8")
            target = directory / COOKIE_COPY_NAME
            write_private_text(target, text)
            return target
