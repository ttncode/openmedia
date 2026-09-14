# Security

## Threat model

OpenMedia is designed to be run by one person or team for their own use.
Exposing it publicly means anyone who reaches the web origin can submit
download requests, unless a password is set. Treat it like any other
self-hosted tool: put it behind a reverse proxy with TLS, set a password if
it is reachable from the internet, and keep the image up to date.

## Password

Set `OPENMEDIA_PASSWORD` to require sign-in for every route except the
session check and health checks. The password is compared with a
constant-time comparison, sign-in attempts are limited to 5 per minute per
client, and the session is a signed cookie, `HttpOnly`, `SameSite=Lax`, and
marked `Secure` whenever the request arrives over https (through the
`X-Forwarded-Proto` header behind a reverse proxy).

## Cross-site request guard

State-changing requests (anything other than GET, HEAD or OPTIONS) are
rejected with `cross_site_request` when the browser's `Sec-Fetch-Site`
header says the request came from another site or from another subdomain of
the same site, or when an `Origin` header is present and does not match the
forwarded host. This stops another website, including a sibling subdomain,
from making download requests through a visitor's browser session.

## Rate limiting

Each client address (read from `X-Forwarded-For` up to
`OPENMEDIA_TRUSTED_PROXY_HOPS` hops, see [Deployment](/deployment)) gets a
token bucket of `OPENMEDIA_RATE_LIMIT_PER_MINUTE` requests per minute for
info, playlist and download requests. Exceeding it returns 429 with a
`Retry-After` header.

## Network guard

Every address a submitted URL's host resolves to must be public; requests to
private, loopback, link-local or otherwise reserved addresses are rejected
unless `OPENMEDIA_ALLOW_PRIVATE_URLS=true`. This check runs once, against the
URL you submit: yt-dlp itself may still follow a redirect to a different
host afterwards, which this guard does not see. If you need to guarantee no
internal address is ever reached, even through a redirect, route yt-dlp's
own traffic through an egress proxy that enforces it, with
`OPENMEDIA_YTDLP_PROXY`.

## Cookie file handling

An uploaded `cookies.txt` file is stored with file mode 0600, never written
to logs, and copied into each job's own directory before yt-dlp reads it, so
concurrent jobs do not race on the same file.

## Running as non-root

The container runs as a non-root user (uid 10001) that owns `/data`. It does
not need, and is not given, elevated privileges.

## Reporting vulnerabilities

See [SECURITY.md](https://github.com/ttncode/openmedia/blob/main/SECURITY.md)
in the repository root for how to report a vulnerability privately.
