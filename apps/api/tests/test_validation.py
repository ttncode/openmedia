import pytest

from app.errors import ApiError
from app.validation import DownloadOptions, Trim, parse_download_options, validate_url


@pytest.mark.parametrize(
    "value",
    [
        "--exec=touch /tmp/pwned",
        "file:///etc/passwd",
        "ftp://example.com/a",
        "https://",
        "https://exa mple.com",
        42,
        None,
        "https://example.com/" + "a" * 2100,
    ],
)
def test_rejects_unsafe_or_malformed_urls(value: object) -> None:
    with pytest.raises(ApiError) as caught:
        validate_url(value)
    assert caught.value.code == "invalid_url"


def test_accepts_and_trims_http_urls() -> None:
    assert (
        validate_url("  https://www.youtube.com/watch?v=abc  ")
        == "https://www.youtube.com/watch?v=abc"
    )


def test_reclip_request_maps_to_video_defaults() -> None:
    options = parse_download_options(
        {"url": "https://x.com/a", "format": "video", "format_id": "137"}
    )
    assert options == DownloadOptions(
        kind="video",
        container="mp4",
        quality_height=None,
        format_id="137",
        audio_format=None,
        audio_quality=None,
        trim=None,
        subtitles=None,
        embed_metadata=True,
    )


def test_reclip_audio_request_defaults_to_mp3() -> None:
    options = parse_download_options({"format": "audio"})
    assert (options.kind, options.audio_format, options.audio_quality) == (
        "audio",
        "mp3",
        "best",
    )


def test_full_request_is_parsed() -> None:
    options = parse_download_options(
        {
            "format": "video",
            "container": "mkv",
            "quality_height": 720,
            "trim": {"start": 5, "end": 65.5},
            "subtitles": {"languages": ["vi", "en-US"], "mode": "srt"},
            "embed_metadata": False,
        }
    )
    assert options.container == "mkv"
    assert options.quality_height == 720
    assert options.trim == Trim(start=5.0, end=65.5)
    assert options.subtitles is not None and options.subtitles.languages == (
        "vi",
        "en-US",
    )
    assert options.embed_metadata is False


@pytest.mark.parametrize(
    "payload",
    [
        {"format": "gif"},
        {"format_id": "137; rm -rf /"},
        {"container": "avi"},
        {"quality_height": 999},
        {"format": "audio", "audio_format": "aac"},
        {"trim": {"start": 10, "end": 5}},
        {"trim": {"start": -1, "end": 5}},
        {
            "subtitles": {
                "languages": ["vi", "en", "fr", "de", "ja", "ko"],
                "mode": "embed",
            }
        },
        {"subtitles": {"languages": ["../x"], "mode": "embed"}},
        {"subtitles": {"languages": ["vi"], "mode": "burn"}},
        {"embed_metadata": "yes"},
    ],
)
def test_invalid_options_are_rejected(payload: dict[str, object]) -> None:
    with pytest.raises(ApiError) as caught:
        parse_download_options(payload)
    assert caught.value.code == "invalid_option"


def test_options_serialize_for_the_job_payload() -> None:
    options = parse_download_options({"format": "audio", "audio_format": "flac"})
    assert options.to_json()["audio_format"] == "flac"
    assert options.to_json()["trim"] is None
