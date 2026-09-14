# 0002 — Proxy the API through the web origin

Status: Accepted
Date: 2026-09-14

## Context

The web app and the API are two separate services. The browser needs some
way to reach the API, and the way that connection is wired affects what
ports must be exposed, what cookies work, and whether the API's address can
change after the web app is built.

## Decision

The browser only ever talks to the web app's own origin. `apps/web`'s
`src/app/api/[...path]/route.ts` proxies every method to `API_URL` at
runtime, streaming request and response bodies and forwarding cookies and
`X-Forwarded-*` headers. There is no build-time API URL baked into the web
bundle; `compose.yaml` publishes only `WEB_PORT` to every interface, and
`API_PORT` is bound to `127.0.0.1` only.

## Consequences

Session cookies are first-party from the browser's point of view, so the
cross-site guard and `SameSite=Lax` work without extra configuration. One
public port needs a certificate and a reverse proxy entry, not two. Changing
`API_URL` (for example, moving the API to a different host) needs no web
rebuild, only a container restart. Every request to the API takes one extra
network hop through the web app's server, which is negligible next to yt-dlp
download times.

## Alternatives considered

- A build-time `NEXT_PUBLIC_API_URL` the browser calls directly. Rejected:
  bakes the API's address into the bundle, requires a second public port and
  a second certificate, and makes the session cookie third-party unless CORS
  and cookie attributes are carefully matched.
- CORS with the browser calling the API's own origin. Rejected: same
  two-port exposure as above, plus the cross-site guard would need to trust
  a configured origin list instead of a same-origin check.
