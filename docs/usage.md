# Usage

## Adding links

Paste one or more links into the field at the top, or drop them anywhere on
the page. Press Enter to fetch info, or Shift+Enter to add another line
first. Pasting anywhere in the window (not just in the field) also fetches
the links it contains.

If a link belongs to a playlist, OpenMedia asks whether to add only that
video or the whole playlist, up to the server's playlist item limit (see
[Configuration](/configuration)).

## Formats and quality

For video, choose a container (MP4 or MKV) and a quality from the list of
available heights and their approximate file sizes. For audio, choose a
format (MP3, M4A, Opus, FLAC or WAV). MP4 always re-encodes to H.264/AAC when
needed for compatibility; MKV keeps the original streams.

## Trimming

Drag the yellow handles on the trim bar to select a start and end point, or
select a handle and use the arrow keys (Shift+arrow for larger steps, Home
and End for the full range). Only the selected part is downloaded.

## Subtitles

Pick a language and whether to embed subtitles into the video file or
download them as a separate `.srt` file. Turn on "Embed cover and details" to
write cover art, metadata and chapters into the file.

## Queue

Each item shows a thumbnail, title and status line. While an item is
downloading, its trailing control shows progress with a stop button; once
finished, click **Save** to save the file to your device. Items that failed
show a **Fix** button, most often to add cookies for age-restricted or
bot-checked videos. The queue polls the server for updates automatically;
you can close the tab and come back later, since the server keeps
downloading.

## History

Finished downloads are kept in your browser's history list, newest first.
Click **Download again** to fetch the same link again. **Clear history**
removes the browser list only; it does not delete files already saved to
your device or affect files still on the server.

## Installing as an app

OpenMedia is an installable PWA. On desktop, use your browser's install
option; on Android, use "Add to Home screen" from the browser menu. Once
installed, sharing a link from another app to OpenMedia (the share target)
opens it with the link already filled in and fetched.

## Keyboard shortcuts

| Keys               | Action                  |
| ------------------ | ----------------------- |
| `/`                | Focus the link field    |
| `Cmd+V` / `Ctrl+V` | Paste and get info      |
| `Esc`              | Close the open panel    |
| `?`                | Show keyboard shortcuts |
