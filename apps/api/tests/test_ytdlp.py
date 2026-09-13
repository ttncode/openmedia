import json
from collections.abc import Mapping, Sequence
from pathlib import Path

import pytest

from app.config import Settings
from app.errors import ApiError
from app.validation import (
    DownloadOptions,
    SubtitleOptions,
    Trim,
    parse_download_options,
)
from app.ytdlp import (
    CompletedRun,
    DownloadRequest,
    YtDlpClient,
    build_download_command,
    build_info_command,
    error_from_output,
    summarize_info,
)

URL = "https://www.youtube.com/watch?v=abc"


def request_for(
    options: DownloadOptions, cookies: Path | None = None
) -> DownloadRequest:
    return DownloadRequest(
        URL, options, Path("/data/downloads/job1"), 4096, cookies, ""
    )


def value_after(command: list[str], flag: str) -> str:
    return command[command.index(flag) + 1]


def test_url_is_always_the_final_argument_after_the_separator() -> None:
    command = build_download_command(request_for(parse_download_options({})))
    assert command[-2:] == ["--", URL]
    assert value_after(command, "-P") == "/data/downloads/job1"
    assert value_after(command, "-o") == "media.%(ext)s"
    assert value_after(command, "--max-filesize") == "4096M"
    assert "--newline" in command and "--no-playlist" in command


def test_mp4_prefers_compatible_codecs_for_a_chosen_format() -> None:
    command = build_download_command(
        request_for(parse_download_options({"format_id": "137"}))
    )
    assert value_after(command, "-f") == "137+bestaudio[ext=m4a]/137+bestaudio/best"
    assert value_after(command, "-S") == "vcodec:h264,acodec:aac"
    assert value_after(command, "--merge-output-format") == "mp4"


def test_mkv_with_height_cap_skips_codec_sorting() -> None:
    command = build_download_command(
        request_for(parse_download_options({"container": "mkv", "quality_height": 720}))
    )
    assert value_after(command, "-f") == "bv*[height<=720]+ba/b[height<=720]/b"
    assert "-S" not in command
    assert value_after(command, "--merge-output-format") == "mkv"


def test_audio_extraction_arguments() -> None:
    command = build_download_command(
        request_for(
            parse_download_options(
                {"format": "audio", "audio_format": "m4a", "audio_quality": "320k"}
            )
        )
    )
    assert value_after(command, "-f") == "ba/b"
    assert "-x" in command
    assert value_after(command, "--audio-format") == "m4a"
    assert value_after(command, "--audio-quality") == "320K"


def test_trim_subtitles_metadata_and_cookies() -> None:
    options = DownloadOptions(
        "video",
        "mp4",
        None,
        None,
        None,
        None,
        Trim(5, 65.5),
        SubtitleOptions(("vi", "en"), "srt"),
        True,
    )
    command = build_download_command(
        request_for(options, Path("/tmp/job/.cookies.txt"))
    )
    assert value_after(command, "--download-sections") == "*5-65.5"
    assert "--force-keyframes-at-cuts" in command
    assert value_after(command, "--sub-langs") == "vi,en"
    assert value_after(command, "--convert-subs") == "srt"
    assert "--embed-subs" not in command
    assert {"--embed-metadata", "--embed-chapters", "--embed-thumbnail"} <= set(command)
    assert value_after(command, "--cookies") == "/tmp/job/.cookies.txt"


def test_wav_skips_thumbnail_embedding() -> None:
    command = build_download_command(
        request_for(parse_download_options({"format": "audio", "audio_format": "wav"}))
    )
    assert "--embed-thumbnail" not in command
    assert "--embed-metadata" in command


def test_info_command_ends_with_separator_and_url() -> None:
    assert build_info_command(URL, None, "socks5://proxy:1080")[-4:] == [
        "--proxy",
        "socks5://proxy:1080",
        "--",
        URL,
    ]


@pytest.mark.parametrize(
    ("line", "code"),
    [
        ("ERROR: [youtube] abc: Sign in to confirm you're not a bot", "bot_check"),
        ("ERROR: [youtube] abc: Private video. Sign in", "private_video"),
        (
            "ERROR: The uploader has not made this video available in your country",
            "geo_blocked",
        ),
        ("ERROR: [youtube] abc: Video unavailable", "unavailable"),
        ("ERROR: Unsupported URL: https://example.com", "unsupported_url"),
        (
            "ERROR: File is larger than max-filesize (5000 bytes > 10 bytes). Aborting.",
            "too_large",
        ),
        ("ERROR: something else broke", "extractor_error"),
    ],
)
def test_error_mapping(line: str, code: str) -> None:
    error = error_from_output(f"[info] noise\n{line}\n")
    assert error.code == code


def test_summarize_keeps_best_format_per_height() -> None:
    info = {
        "id": "abc",
        "title": "Pho",
        "thumbnail": "https://i.ytimg.com/a.jpg",
        "duration": 1122,
        "uploader": "Bep",
        "extractor_key": "Youtube",
        "webpage_url": URL,
        "chapters": [{"title": "Intro"}],
        "subtitles": {"vi": [], "en": []},
        "formats": [
            {
                "format_id": "136",
                "height": 720,
                "vcodec": "avc1",
                "tbr": 900,
                "ext": "mp4",
                "filesize": 236,
            },
            {
                "format_id": "247",
                "height": 720,
                "vcodec": "vp9",
                "tbr": 1200,
                "ext": "webm",
                "filesize_approx": 250,
            },
            {
                "format_id": "137",
                "height": 1080,
                "vcodec": "avc1",
                "tbr": 2000,
                "ext": "mp4",
                "filesize": 412,
            },
            {"format_id": "140", "height": None, "vcodec": "none", "ext": "m4a"},
        ],
    }
    summary = summarize_info(info)
    formats = summary["formats"]
    assert isinstance(formats, list)
    assert [entry["id"] for entry in formats] == ["137", "247"]
    assert summary["subtitle_languages"] == ["en", "vi"]
    assert summary["has_chapters"] is True
    assert summary["platform"] == "Youtube"


class RecordingRunner:
    def __init__(self, result: CompletedRun) -> None:
        self.result = result
        self.commands: list[list[str]] = []

    def __call__(
        self, command: Sequence[str], timeout: float, env: Mapping[str, str]
    ) -> CompletedRun:
        self.commands.append(list(command))
        return self.result


def no_cookies(directory: Path) -> Path | None:
    return None


def test_fetch_info_summarizes_output(settings: Settings) -> None:
    runner = RecordingRunner(
        CompletedRun(0, json.dumps({"title": "Pho", "formats": []}), "")
    )
    info = YtDlpClient(settings, no_cookies, runner).fetch_info(URL)
    assert info["title"] == "Pho"
    assert runner.commands[0][-2:] == ["--", URL]


def test_fetch_info_raises_mapped_error(settings: Settings) -> None:
    runner = RecordingRunner(
        CompletedRun(1, "", "ERROR: [youtube] abc: Sign in to confirm you're not a bot")
    )
    with pytest.raises(ApiError) as caught:
        YtDlpClient(settings, no_cookies, runner).fetch_info(URL)
    assert caught.value.code == "bot_check"


def test_fetch_playlist_limits_entries(settings: Settings) -> None:
    document = {
        "title": "Mix",
        "entries": [{"url": f"https://www.youtube.com/watch?v={n}"} for n in range(5)],
    }
    runner = RecordingRunner(CompletedRun(0, json.dumps(document), ""))
    playlist = YtDlpClient(settings, no_cookies, runner).fetch_playlist(URL, 3)
    assert playlist == {
        "title": "Mix",
        "count": 3,
        "urls": [f"https://www.youtube.com/watch?v={n}" for n in range(3)],
    }
    assert runner.commands[0][runner.commands[0].index("--playlist-end") + 1] == "3"
