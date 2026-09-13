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
    def __init__(
        self, per_minute: int, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._capacity = float(per_minute)
        self._refill_per_second = per_minute / SECONDS_PER_MINUTE
        self._clock = clock
        self._buckets: dict[str, tuple[float, float]] = {}
        self._lock = threading.Lock()

    def retry_after(self, key: str) -> float | None:
        with self._lock:
            now = self._clock()
            tokens, updated = self._buckets.get(key, (self._capacity, now))
            tokens = min(
                self._capacity, tokens + (now - updated) * self._refill_per_second
            )
            if tokens < 1:
                self._buckets[key] = (tokens, now)
                return (1 - tokens) / self._refill_per_second
            self._buckets[key] = (tokens - 1, now)
            return None

    def enforce(self, key: str) -> None:
        wait = self.retry_after(key)
        if wait is not None:
            headers = {"Retry-After": str(math.ceil(wait))}
            raise ApiError(
                429, "rate_limited", "Too many requests. Try again shortly.", headers
            )


def client_address() -> str:
    return request.remote_addr or "unknown"


def _cross_site_error() -> ApiError:
    return ApiError(
        403, "cross_site_request", "Requests from other websites are not allowed."
    )


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
