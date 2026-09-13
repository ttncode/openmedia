import shutil
import stat
from dataclasses import asdict, dataclass
from pathlib import Path

from .errors import ApiError

BYTES_PER_GIGABYTE = 1024**3


@dataclass(frozen=True)
class StorageUsage:
    used_bytes: int
    limit_bytes: int | None
    free_bytes: int

    def to_json(self) -> dict[str, int | None]:
        return asdict(self)


def _entry_size(entry: Path) -> int:
    try:
        info = entry.stat()
    except FileNotFoundError:
        return 0
    return info.st_size if stat.S_ISREG(info.st_mode) else 0


def directory_size(path: Path) -> int:
    if not path.is_dir():
        return 0
    return sum(_entry_size(entry) for entry in path.rglob("*"))


def _free_bytes(path: Path) -> int:
    existing = path if path.exists() else path.parent
    return shutil.disk_usage(existing).free


def storage_usage(downloads_dir: Path, max_storage_gb: int) -> StorageUsage:
    limit = max_storage_gb * BYTES_PER_GIGABYTE if max_storage_gb > 0 else None
    return StorageUsage(
        used_bytes=directory_size(downloads_dir),
        limit_bytes=limit,
        free_bytes=_free_bytes(downloads_dir),
    )


def ensure_capacity(usage: StorageUsage) -> None:
    if usage.limit_bytes is not None and usage.used_bytes >= usage.limit_bytes:
        raise ApiError(
            507,
            "storage_full",
            "Server storage is full. Remove finished downloads or raise the limit.",
        )
