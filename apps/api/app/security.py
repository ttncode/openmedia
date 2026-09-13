import hashlib
import hmac
import math
import secrets
import threading
import time
from collections.abc import Callable
from urllib.parse import urlsplit

from flask import Flask, current_app, request, session
from flask.sessions import SecureCookieSessionInterface

from .config import Settings
from .errors import ApiError
from .private_files import write_private_text

AUTHENTICATED_SESSION_KEY = "openmedia_authenticated"
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
CROSS_SITE_FETCH_VALUES = frozenset({"cross-site", "same-site"})
SECONDS_PER_MINUTE = 60.0
SECRET_KEY_BYTES = 32


def load_or_create_secret_key(settings: Settings) -> str:
    if settings.secret_key:
        return settings.secret_key
    path = settings.secret_key_file
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()
    path.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_hex(SECRET_KEY_BYTES)
    write_private_text(path, key)
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


def _secret_key_bytes() -> bytes:
    secret = current_app.secret_key
    if secret is None:
        raise RuntimeError("Flask secret_key must be configured before signing in.")
    return secret if isinstance(secret, bytes) else secret.encode()


def _password_fingerprint(settings: Settings) -> str:
    return hmac.new(
        _secret_key_bytes(), settings.password.encode(), hashlib.sha256
    ).hexdigest()


def is_authenticated(settings: Settings) -> bool:
    if not settings.password:
        return True
    fingerprint = session.get(AUTHENTICATED_SESSION_KEY)
    return isinstance(fingerprint, str) and hmac.compare_digest(
        fingerprint, _password_fingerprint(settings)
    )


def ensure_authenticated(settings: Settings) -> None:
    if not is_authenticated(settings):
        raise ApiError(401, "auth_required", "Sign in to continue.")


def password_matches(settings: Settings, candidate: object) -> bool:
    if not settings.password or not isinstance(candidate, str):
        return False
    return hmac.compare_digest(candidate.encode(), settings.password.encode())


def sign_in(settings: Settings) -> None:
    session.clear()
    session[AUTHENTICATED_SESSION_KEY] = _password_fingerprint(settings)
    session.permanent = True


def sign_out() -> None:
    session.clear()


class ForwardedProtoSessionInterface(SecureCookieSessionInterface):
    def get_cookie_secure(self, app: Flask) -> bool:
        return request.is_secure
