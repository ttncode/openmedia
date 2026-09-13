import stat
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
    with app.test_request_context(
        "/api/download", method="POST", headers=headers, base_url="http://localhost"
    ):
        if allowed:
            ensure_same_origin_request()
        else:
            with pytest.raises(ApiError) as caught:
                ensure_same_origin_request()
            assert caught.value.code == "cross_site_request"


def test_safe_methods_skip_the_guard() -> None:
    app = Flask(__name__)
    with app.test_request_context(
        "/api/jobs", method="GET", headers={"Sec-Fetch-Site": "cross-site"}
    ):
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
        sign_in(protected)
        assert is_authenticated(protected) is True


def test_sign_in_is_revoked_when_password_changes(settings: Settings) -> None:
    protected = replace(settings, password="correct horse")
    app = Flask(__name__)
    app.secret_key = "test"
    with app.test_request_context("/api/jobs"):
        sign_in(protected)
        assert is_authenticated(protected) is True
        changed = replace(protected, password="different password")
        assert is_authenticated(changed) is False


def test_secret_key_is_generated_once(settings: Settings) -> None:
    generated = replace(settings, secret_key="")
    first = load_or_create_secret_key(generated)
    assert len(first) == 64
    assert load_or_create_secret_key(generated) == first
    assert load_or_create_secret_key(settings) == "test-secret-key"
    assert stat.S_IMODE(generated.secret_key_file.stat().st_mode) == 0o600
