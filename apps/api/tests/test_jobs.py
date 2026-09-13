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
        while self.script.hold and not (
            self.script.release.is_set() or self.terminated.is_set()
        ):
            time.sleep(0.01)
        if not self.terminated.is_set():
            for name, size in self.script.files.items():
                (self.job_dir / name).write_bytes(b"x" * size)

    def wait(self) -> int:
        return -15 if self.terminated.is_set() else self.script.returncode

    def terminate(self) -> None:
        self.terminated.set()


class ProcessScript:
    def __init__(
        self,
        lines: list[str],
        files: dict[str, int],
        returncode: int = 0,
        hold: bool = False,
    ) -> None:
        self.lines = lines
        self.files = files
        self.returncode = returncode
        self.hold = hold
        self.release = threading.Event()
        self.processes: list[ScriptedProcess] = []

    def __call__(
        self, command: Sequence[str], env: Mapping[str, str]
    ) -> ScriptedProcess:
        process = ScriptedProcess(command, self)
        self.processes.append(process)
        return process


def no_cookies(directory: Path) -> Path | None:
    return None


def make_manager(
    settings: Settings, script: ProcessScript, concurrency: int = 3
) -> JobManager:
    store = SettingsStore(settings.settings_file, RuntimeSettings(60, concurrency))
    return JobManager(
        JobRuntime(
            settings=settings,
            store=store,
            copy_cookies=no_cookies,
            process_factory=script,
        )
    )


def test_successful_download_collects_named_files(settings: Settings) -> None:
    script = ProcessScript(
        ["OMPROGRESS 50 100 NA 1000 5", '[Merger] Merging formats into "media.mp4"'],
        {"media.mp4": 30, "media.vi.srt": 5},
    )
    manager = make_manager(settings, script)
    job = manager.submit(
        URL,
        "Phở: bò/Hà Nội",
        parse_download_options({"subtitles": {"languages": ["vi"], "mode": "srt"}}),
    )
    assert manager.wait_until_idle(5)
    assert job.status is JobStatus.DONE
    assert job.progress == 100.0
    assert [(f.name, f.kind, f.size_bytes) for f in job.files] == [
        ("Phở bòHà Nội.mp4", "media", 30),
        ("Phở bòHà Nội.vi.srt", "subtitle", 5),
    ]
    payload = manager.to_json(job)
    assert payload["status"] == "done"
    assert payload["filename"] == "Phở bòHà Nội.mp4"
    assert payload["expires_at"] is not None


def test_failure_maps_the_last_error_line(settings: Settings) -> None:
    script = ProcessScript(
        ["ERROR: [youtube] abc: Sign in to confirm you're not a bot"], {}, returncode=1
    )
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
    manager = JobManager(
        JobRuntime(
            settings=settings,
            store=store,
            copy_cookies=no_cookies,
            process_factory=script,
        )
    )
    manager.submit(URL, "a", parse_download_options({}))
    queued = manager.submit(URL, "b", parse_download_options({}))
    store.update({"max_concurrent": 2})
    manager.dispatch()
    assert queued.status is JobStatus.DOWNLOADING
    script.release.set()
    assert manager.wait_until_idle(5)


def test_cancelling_a_running_job_stops_the_process_and_removes_files(
    settings: Settings,
) -> None:
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
    manager.submit(URL, "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    assert manager.remove_finished_before(datetime.now(UTC) - timedelta(minutes=5)) == 0
    assert manager.remove_finished_before(datetime.now(UTC) + timedelta(seconds=1)) == 1
    assert manager.known_job_ids() == set()


def test_unknown_job_is_not_found(settings: Settings) -> None:
    with pytest.raises(ApiError) as caught:
        make_manager(settings, ProcessScript([], {})).get("missing")
    assert caught.value.code == "not_found"
