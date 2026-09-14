from dataclasses import dataclass

PROGRESS_MARKER = "OMPROGRESS"
PROGRESS_FIELD_COUNT = 6
POSTPROCESSOR_TAGS = (
    "[Merger]",
    "[ExtractAudio]",
    "[EmbedSubtitle]",
    "[Metadata]",
    "[EmbedThumbnail]",
    "[FixupM3u8]",
    "[FixupM4a]",
    "[VideoConvertor]",
    "[VideoRemuxer]",
    "[SubtitlesConvertor]",
    "[ThumbnailsConvertor]",
    "[ModifyChapters]",
)
STREAM_RANGES = ((0.0, 90.0), (90.0, 99.0))
PROCESSING_PERCENT = 99.0


@dataclass(frozen=True)
class ProgressSample:
    downloaded_bytes: int | None
    total_bytes: int | None
    speed_bps: float | None
    eta_seconds: int | None


def _number(token: str) -> float | None:
    try:
        value = float(token)
    except ValueError:
        return None
    return value if value >= 0 else None


def _whole(value: float | None) -> int | None:
    return None if value is None else int(value)


def parse_progress_line(line: str) -> ProgressSample | None:
    parts = line.split()
    if len(parts) != PROGRESS_FIELD_COUNT or parts[0] != PROGRESS_MARKER:
        return None
    downloaded, total, estimate, speed, eta = (_number(token) for token in parts[1:])
    return ProgressSample(
        downloaded_bytes=_whole(downloaded),
        total_bytes=_whole(total if total is not None else estimate),
        speed_bps=speed,
        eta_seconds=_whole(eta),
    )


def is_postprocessing_line(line: str) -> bool:
    return line.lstrip().startswith(POSTPROCESSOR_TAGS)


class ProgressTracker:
    def __init__(self) -> None:
        self.percent = 0.0
        self._stream = 0
        self._last_downloaded = -1

    def record(self, sample: ProgressSample) -> float:
        downloaded = sample.downloaded_bytes or 0
        if downloaded < self._last_downloaded and self._stream < len(STREAM_RANGES) - 1:
            self._stream += 1
        self._last_downloaded = downloaded
        if sample.total_bytes:
            low, high = STREAM_RANGES[self._stream]
            fraction = min(downloaded / sample.total_bytes, 1.0)
            self.percent = max(self.percent, low + (high - low) * fraction)
        return self.percent

    def record_processing(self) -> float:
        self.percent = max(self.percent, PROCESSING_PERCENT)
        return self.percent
