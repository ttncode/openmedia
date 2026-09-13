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
    assert [(row.domain, row.expires) for row in rows] == [
        ("youtube.com", 1893456000),
        ("youtube.com", 1861920000),
        ("accounts.google.com", 0),
    ]


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
