import os
from pathlib import Path

import pytest

from app.errors import ApiError
from app.storage import StorageUsage, ensure_capacity, storage_usage


def test_usage_counts_files_recursively(tmp_path: Path) -> None:
    (tmp_path / "job1").mkdir()
    (tmp_path / "job1" / "media.mp4").write_bytes(b"x" * 1500)
    (tmp_path / "loose.bin").write_bytes(b"x" * 500)
    usage = storage_usage(tmp_path, 0)
    assert usage.used_bytes == 2000
    assert usage.limit_bytes is None
    assert usage.free_bytes > 0


def test_limit_is_reported_in_bytes(tmp_path: Path) -> None:
    assert storage_usage(tmp_path, 2).limit_bytes == 2 * 1024**3


def test_missing_directory_counts_as_empty(tmp_path: Path) -> None:
    assert storage_usage(tmp_path / "absent", 0).used_bytes == 0


def test_vanished_file_is_skipped(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "steady.bin").write_bytes(b"x" * 100)
    vanished = tmp_path / "downloading.part"
    vanished.write_bytes(b"x" * 50)
    original_stat = Path.stat

    def flaky_stat(self: Path, *, follow_symlinks: bool = True) -> os.stat_result:
        if self == vanished:
            raise FileNotFoundError(self)
        return original_stat(self, follow_symlinks=follow_symlinks)

    monkeypatch.setattr(Path, "stat", flaky_stat)
    assert storage_usage(tmp_path, 0).used_bytes == 100


def test_full_storage_is_refused() -> None:
    with pytest.raises(ApiError) as caught:
        ensure_capacity(StorageUsage(used_bytes=10, limit_bytes=10, free_bytes=100))
    assert (caught.value.status, caught.value.code) == (507, "storage_full")
    ensure_capacity(StorageUsage(used_bytes=9, limit_bytes=10, free_bytes=100))
    ensure_capacity(StorageUsage(used_bytes=10**12, limit_bytes=None, free_bytes=100))
