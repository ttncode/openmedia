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
    orphans = [
        path
        for path in downloads_dir.iterdir()
        if path.is_dir() and path.name not in known_job_ids
    ]
    for path in orphans:
        shutil.rmtree(path, ignore_errors=True)
    return len(orphans)


class RetentionSweeper:
    def __init__(
        self,
        manager: JobManager,
        store: SettingsStore,
        now: Callable[[], datetime] = utc_now,
    ) -> None:
        self._manager = manager
        self._store = store
        self._now = now
        self._stopped = threading.Event()
        self._thread = threading.Thread(
            target=self._loop, name="retention-sweeper", daemon=True
        )

    def sweep_once(self) -> int:
        cutoff = self._now() - timedelta(
            minutes=self._store.current().retention_minutes
        )
        return self._manager.remove_finished_before(cutoff)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stopped.set()

    def _loop(self) -> None:
        while not self._stopped.wait(SWEEP_INTERVAL_SECONDS):
            self.sweep_once()
