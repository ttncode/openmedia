import logging
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
from .ytdlp import (
    CookieCopier,
    DownloadRequest,
    build_download_command,
    error_from_output,
    known_error,
    ytdlp_environment,
)

OUTPUT_TAIL_LINES = 40
MAX_TITLE_LENGTH = 100
FIRST_PRINTABLE_CODE = 0x20
DELETE_CODE = 0x7F
CONTROL_CHARACTERS = frozenset(map(chr, [*range(FIRST_PRINTABLE_CODE), DELETE_CODE]))
TITLE_UNSAFE_CHARACTERS = frozenset('\\/:*?"<>|') | CONTROL_CHARACTERS
SUBTITLE_SUFFIXES = frozenset({".srt", ".vtt", ".ass", ".lrc"})
PARTIAL_SUFFIXES = frozenset({".part", ".ytdl", ".temp"})
WATCHDOG_INTERVAL_SECONDS = 1.0
TERMINATED_EXIT_CODE = -15
IDLE_POLL_INTERVAL_SECONDS = 0.005
PROCESSING_STALL_MULTIPLIER = 10

logger = logging.getLogger(__name__)


class JobStatus(StrEnum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"
    CANCELLED = "cancelled"


ACTIVE_STATUSES = frozenset(
    {JobStatus.QUEUED, JobStatus.DOWNLOADING, JobStatus.PROCESSING}
)


class ProcessHandle(Protocol):
    def output_lines(self) -> Iterator[str]: ...

    def wait(self) -> int: ...

    def terminate(self) -> None: ...


ProcessFactory = Callable[[Sequence[str], Mapping[str, str]], ProcessHandle]


class SubprocessHandle:
    def __init__(self, command: Sequence[str], env: Mapping[str, str]) -> None:
        self._process = subprocess.Popen(
            list(command),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            env=dict(env),
            start_new_session=True,
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
        return {
            "index": self.index,
            "name": self.name,
            "kind": self.kind,
            "size_bytes": self.size_bytes,
        }


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
    cleaned = "".join(
        character for character in title if character not in TITLE_UNSAFE_CHARACTERS
    )
    return cleaned.strip()[:MAX_TITLE_LENGTH].strip() or fallback


def collect_files(job_dir: Path, title: str, job_id: str) -> list[JobFile]:
    candidates = [
        path
        for path in sorted(job_dir.iterdir())
        if path.is_file()
        and not path.name.startswith(".")
        and path.suffix not in PARTIAL_SUFFIXES
    ]
    media = [path for path in candidates if path.suffix not in SUBTITLE_SUFFIXES]
    if not media:
        return []
    stem = safe_title(title, f"openmedia-{job_id}")
    primary = max(media, key=lambda path: path.stat().st_size)
    subtitles = [path for path in candidates if path.suffix in SUBTITLE_SUFFIXES]
    named = [(primary, f"{stem}{primary.suffix}", "media")]
    named += [
        (path, f"{stem}.{path.name.split('.', 1)[1]}", "subtitle") for path in subtitles
    ]
    return [
        JobFile(index, name, kind, path.stat().st_size, path)
        for index, (path, name, kind) in enumerate(named)
    ]


class StallWatchdog:
    def __init__(self, handle: ProcessHandle, timeout_seconds: float, job: Job) -> None:
        self._handle = handle
        self._timeout = timeout_seconds
        self._job = job
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

    def _current_timeout(self) -> float:
        if self._job.status is JobStatus.PROCESSING:
            return self._timeout * PROCESSING_STALL_MULTIPLIER
        return self._timeout

    def _watch(self) -> None:
        interval = min(WATCHDOG_INTERVAL_SECONDS, self._timeout / 4)
        while not self._stopped.wait(interval):
            if time.monotonic() - self._last_activity > self._current_timeout():
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
        self._pending_threads = 0
        self._lock = threading.RLock()

    def submit(self, url: str, title: str, options: DownloadOptions) -> Job:
        job = Job(
            job_id=secrets.token_hex(5),
            url=url,
            title=title,
            options=options,
            created_at=self._runtime.now(),
        )
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
            return sorted(
                self._jobs.values(), key=lambda job: job.created_at, reverse=True
            )

    def known_job_ids(self) -> set[str]:
        with self._lock:
            return set(self._jobs)

    def _queued_in_order(self) -> list[Job]:
        return [
            job
            for job in sorted(self._jobs.values(), key=lambda job: job.created_at)
            if job.status is JobStatus.QUEUED
        ]

    def queue_position(self, job: Job) -> int:
        with self._lock:
            queued = self._queued_in_order()
        return queued.index(job) + 1 if job in queued else 0

    def _expires_at(self, job: Job) -> datetime | None:
        if job.status is not JobStatus.DONE or job.finished_at is None:
            return None
        return job.finished_at + timedelta(
            minutes=self._runtime.store.current().retention_minutes
        )

    def to_json(self, job: Job) -> dict[str, object]:
        with self._lock:
            return {
                "job_id": job.job_id,
                "url": job.url,
                "title": job.title,
                "status": job.status.value,
                "progress": job.progress,
                "speed_bps": job.speed_bps,
                "eta_seconds": job.eta_seconds,
                "downloaded_bytes": job.downloaded_bytes,
                "total_bytes": job.total_bytes,
                "queue_position": self.queue_position(job),
                "options": job.options.to_json(),
                "filename": job.filename,
                "files": [entry.to_json() for entry in job.files],
                "error": job.error,
                "error_code": job.error_code,
                "created_at": isoformat(job.created_at),
                "finished_at": isoformat(job.finished_at),
                "expires_at": isoformat(self._expires_at(job)),
            }

    def dispatch(self) -> None:
        with self._lock:
            open_slots = self._runtime.store.current().max_concurrent - len(
                self._running
            )
            for job in self._queued_in_order()[: max(open_slots, 0)]:
                job.status = JobStatus.DOWNLOADING
                self._running.add(job.job_id)
                self._pending_threads += 1
                thread = threading.Thread(
                    target=self._run, args=(job,), name=f"job-{job.job_id}", daemon=True
                )
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
            expired = [
                job
                for job in self._jobs.values()
                if not job.is_active
                and job.finished_at is not None
                and job.finished_at < cutoff
            ]
            for job in expired:
                del self._jobs[job.job_id]
        for job in expired:
            self._remove_directory(job)
        return len(expired)

    def wait_until_idle(self, timeout: float) -> bool:
        deadline = time.monotonic() + timeout
        while True:
            with self._lock:
                idle = self._pending_threads == 0 and not any(
                    job.is_active for job in self._jobs.values()
                )
            if idle:
                return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(IDLE_POLL_INTERVAL_SECONDS)

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
        try:
            try:
                job_dir.mkdir(parents=True, exist_ok=True)
                outcome = self._execute(job, job_dir)
            except Exception as error:
                logger.exception("Job %s failed unexpectedly", job.job_id)
                outcome = Outcome(
                    returncode=1,
                    output=f"ERROR: {error}",
                    stalled=False,
                    cookies_file=None,
                )
            self._finish(job, job_dir, outcome)
            self.dispatch()
        finally:
            with self._lock:
                self._pending_threads -= 1

    def _execute(self, job: Job, job_dir: Path) -> Outcome:
        settings = self._runtime.settings
        cookies_file = self._runtime.copy_cookies(job_dir)
        with self._lock:
            cancelled_before_start = job.job_id in self._cancelled
        if cancelled_before_start:
            return Outcome(
                returncode=TERMINATED_EXIT_CODE,
                output="",
                stalled=False,
                cookies_file=cookies_file,
            )
        request = DownloadRequest(
            job.url,
            job.options,
            job_dir,
            settings.max_filesize_mb,
            cookies_file,
            settings.ytdlp_proxy,
        )
        handle = self._runtime.process_factory(
            build_download_command(request), ytdlp_environment(settings)
        )
        with self._lock:
            if job.job_id in self._cancelled:
                handle.terminate()
            else:
                self._handles[job.job_id] = handle
        watchdog = StallWatchdog(handle, settings.stall_timeout_seconds, job)
        watchdog.start()
        try:
            tail: deque[str] = deque(maxlen=OUTPUT_TAIL_LINES)
            tracker = ProgressTracker()
            for line in handle.output_lines():
                watchdog.touch()
                tail.append(line.rstrip())
                self._apply_line(job, tracker, line)
            returncode = handle.wait()
        finally:
            watchdog.stop()
        return Outcome(returncode, "\n".join(tail), watchdog.fired, cookies_file)

    def _apply_line(self, job: Job, tracker: ProgressTracker, line: str) -> None:
        sample = parse_progress_line(line)
        with self._lock:
            if job.job_id in self._cancelled:
                return
            if sample is not None:
                job.progress = round(tracker.record(sample), 1)
                job.downloaded_bytes, job.total_bytes = (
                    sample.downloaded_bytes,
                    sample.total_bytes,
                )
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
                try:
                    self._record_outcome(job, job_dir, outcome)
                except Exception as error:
                    logger.exception(
                        "Job %s failed while recording its outcome", job.job_id
                    )
                    self._fail(job, "extractor_error", f"Unexpected error: {error}")
        if cancelled:
            self._remove_directory(job)

    def _record_outcome(self, job: Job, job_dir: Path, outcome: Outcome) -> None:
        job.finished_at = self._runtime.now()
        job.speed_bps, job.eta_seconds = None, None
        if outcome.stalled:
            self._fail(job, "timeout", "The download stalled and was stopped.")
            return
        if outcome.returncode != 0:
            error = error_from_output(outcome.output)
            self._fail(job, error.code, error.message)
            return
        files = collect_files(job_dir, job.title, job.job_id)
        if not files:
            error = known_error(outcome.output) or ApiError(
                400, "extractor_error", "The download finished but no file was found."
            )
            self._fail(job, error.code, error.message)
            return
        job.files, job.status, job.progress = files, JobStatus.DONE, 100.0

    def _fail(self, job: Job, code: str, message: str) -> None:
        job.status, job.error_code, job.error = JobStatus.ERROR, code, message
