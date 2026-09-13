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
    store = SettingsStore(
        settings.settings_file,
        RuntimeSettings(settings.retention_minutes, settings.max_concurrent),
    )
    cookies = CookieStore(settings.cookies_file)
    runtime = JobRuntime(
        settings=settings,
        store=store,
        copy_cookies=cookies.copy_into,
        process_factory=process_factory,
    )
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
