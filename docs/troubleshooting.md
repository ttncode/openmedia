# Troubleshooting

## "Sign in to confirm you're not a bot"

The site is asking for a logged-in session before it will serve the video.
Export cookies from a logged-in browser session using a cookies.txt browser
extension, then upload the file in **Settings > Cookies**. OpenMedia sends
these cookies to yt-dlp for matching requests.

## Age-restricted videos

Age-restricted videos need the same cookie upload as above, from an account
old enough to view the content.

## "Links to private or local network addresses are not allowed"

OpenMedia refuses to fetch a URL whose host resolves to a private, loopback,
link-local or otherwise reserved address, to stop the server being used to
reach its own internal network. If you intentionally need to download from
an address like this, set `OPENMEDIA_ALLOW_PRIVATE_URLS=true`; only do this
if you trust everyone who can submit a link to this instance.

## Files missing after a while

Finished downloads are deleted once their retention period elapses (60
minutes by default; see [Configuration](/configuration)). Save files to your
device before the retention period ends, or increase retention in
**Settings**.

## Storage full

A download is refused with a storage-full error once `OPENMEDIA_MAX_STORAGE_GB`
is reached. Remove finished downloads, wait for retention to clean them up,
or raise the limit.

## "The file could not be converted to the chosen format"

Some sites serve a single file whose video or audio codec MP4 cannot hold.
OpenMedia remuxes it without re-encoding, so the conversion fails. Choose
**MKV**, which accepts almost any codec, and download again.

## API unreachable

Check that both containers are running and healthy:

```bash
docker compose ps
docker compose logs api
```

The API only listens on `127.0.0.1`; if you access the host remotely,
connect to `WEB_PORT`, not `API_PORT`.

## Slow or stalled downloads

A download with no progress for `OPENMEDIA_STALL_TIMEOUT_SECONDS` (180
seconds by default) is stopped automatically and marked as failed. Retry it;
a persistently slow download is usually the source site throttling the
connection rather than an OpenMedia problem.
