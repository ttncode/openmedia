from app.progress import (
    ProgressSample,
    ProgressTracker,
    is_postprocessing_line,
    parse_progress_line,
)


def test_parses_a_full_progress_line() -> None:
    sample = parse_progress_line("OMPROGRESS 1048576 4194304 NA 524288.5 6")
    assert sample == ProgressSample(
        downloaded_bytes=1048576, total_bytes=4194304, speed_bps=524288.5, eta_seconds=6
    )


def test_falls_back_to_the_size_estimate() -> None:
    sample = parse_progress_line("OMPROGRESS 100 NA 400.0 NA NA")
    assert sample is not None
    assert (sample.total_bytes, sample.speed_bps, sample.eta_seconds) == (
        400,
        None,
        None,
    )


def test_ignores_other_output() -> None:
    assert parse_progress_line("[youtube] abc: Downloading webpage") is None
    assert parse_progress_line("OMPROGRESS 1 2") is None


def test_detects_postprocessing_lines() -> None:
    assert is_postprocessing_line('[Merger] Merging formats into "media.mp4"')
    assert is_postprocessing_line("[ExtractAudio] Destination: media.mp3")
    assert not is_postprocessing_line("[download] Destination: media.f137.mp4")


def test_two_streams_map_into_one_rising_percentage() -> None:
    tracker = ProgressTracker()
    assert tracker.record(ProgressSample(50, 100, None, None)) == 45.0
    assert tracker.record(ProgressSample(100, 100, None, None)) == 90.0
    assert tracker.record(ProgressSample(10, 20, None, None)) == 94.5
    assert tracker.record_processing() == 99.0
    assert tracker.record(ProgressSample(20, 20, None, None)) == 99.0


def test_unknown_total_keeps_the_percentage() -> None:
    tracker = ProgressTracker()
    assert tracker.record(ProgressSample(500, None, 10.0, None)) == 0.0
