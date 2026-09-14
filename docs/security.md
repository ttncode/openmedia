# Security

## Threat model

OpenMedia is designed to be run by one person or team for their own use.
Exposing it publicly means anyone who reaches the web origin can submit
download requests, unless a password is set. Treat it like any other
self-hosted tool: put it behind a reverse proxy with TLS, keep a password set,
and keep the image up to date.

## Password

Set `OPENMEDIA_PASSWORD` to require sign-in for every route except the
session check and health checks. The password is compared with a
constant-time comparison, sign-in attempts are limited to 5 per minute per
client address and 30 per minute across all clients, and the session is a signed cookie, `HttpOnly`, `SameSite=Lax`, and
marked `Secure` whenever the request arrives over https (through the
`X-Forwarded-Proto` header behind a reverse proxy).

`example.env` ships `OPENMEDIA_PASSWORD=changeme`, `install.sh` replaces it
with a random password, and the API refuses to start while the password is
still `changeme`. An empty password turns sign-in off. Only do that for a
private local instance, and read the next section first.

## DNS rebinding

A password is also what stops DNS rebinding. A web page on another site can
switch its own domain name to your instance's address after the page has
loaded. From then on the browser treats requests to your instance as coming
from that page's own origin, so the cross-site request guard below cannot tell
them apart from the web UI's own requests. This reaches instances that are
only on your local network or on `localhost`, because the visitor's browser
makes the requests. Without a password such a page can start downloads, read
the queue and change settings. With a password it cannot: the browser holds no
session cookie for the attacker's domain, and the page does not know the
password.

## Cross-site request guard

State-changing requests (anything other than GET, HEAD or OPTIONS) are
rejected with `cross_site_request` when the browser's `Sec-Fetch-Site`
header says the request came from another site or from another subdomain of
the same site, or when an `Origin` header is present and does not match the
forwarded host. This stops another website, including a sibling subdomain,
from making download requests through a visitor's browser session.

## Rate limiting

Each client address gets a token bucket of `OPENMEDIA_RATE_LIMIT_PER_MINUTE`
requests per minute for info, playlist and download requests. Exceeding it,
or the sign-in limits above, returns 429 with a `Retry-After` header.

The API reads the client address from `X-Forwarded-For` (see
[Deployment](/deployment)). The `web` container passes that header on
unchanged when a request already carries one, so a client that connects to
`WEB_PORT` directly can write any address into it and get a fresh bucket for
every request. Per-client limits only hold when a reverse proxy you control
sets the header and `WEB_PORT` cannot be reached around it; bind `WEB_PORT`
to `127.0.0.1` in that setup.

Two protections do not depend on the header. Sign-in attempts are capped at
30 per minute across all clients, so rotating addresses cannot guess a
password faster than that; the cost is that during such an attack everyone
else's sign-in is slowed too. And once more than 10,000 client addresses are
tracked, buckets that have fully refilled are dropped, so rotating addresses
cannot grow memory without bound.

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
