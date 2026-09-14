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
    manager = JobManager(
        JobRuntime(
            settings=settings,
            store=store,
            copy_cookies=no_cookies,
            process_factory=ProcessScript([], {"media.mp4": 1}),
        )
    )
    manager.submit("https://www.youtube.com/watch?v=a", "x", parse_download_options({}))
    assert manager.wait_until_idle(5)
    later = datetime.now(UTC) + timedelta(minutes=16)
    assert RetentionSweeper(manager, store, now=lambda: later).sweep_once() == 1
