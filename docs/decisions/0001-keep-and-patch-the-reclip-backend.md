# 0001 — Keep and patch the ReClip backend

Status: Accepted
Date: 2026-09-14

## Context

ReClip (https://github.com/averygan/reclip) already ships a Flask and yt-dlp
backend with proven extractor coverage across the sites OpenMedia needs to
support: video and audio formats, trimming, subtitles, metadata, cookies and
a job queue. Building an equivalent backend from nothing would mean
re-solving problems ReClip already solved, with no guarantee of matching its
extractor compatibility.

ReClip's backend was not written for exposure beyond a trusted local user: it
has no URL validation against private networks, no cross-site request guard,
and no rate limiting.

## Decision

Keep ReClip's Flask and yt-dlp backend as the base for `apps/api`, and patch
it rather than rewrite it: add URL and option validation, a network guard
against private and reserved addresses, a cross-site request guard, password
authentication and rate limiting, then extend it with the features OpenMedia
needs beyond ReClip's original scope (settings persistence, storage limits,
cookie management). The HTTP surface stays close to ReClip's own, including
its error response shape, so existing client code keeps working.

## Consequences

OpenMedia inherits ReClip's extractor coverage and its yt-dlp invocation
patterns immediately, at the cost of carrying forward its original module
structure until a later change has reason to restructure it. The security
patches are the responsibility of this project going forward; ReClip's
upstream fixes do not arrive automatically.

## Alternatives considered

- Rewrite the backend in Node, to share one language with the web app.
  Rejected: yt-dlp is a Python tool, and rewriting the extractor and job
  logic from scratch would take longer than patching a working backend, for
  no capability gain.
- Copy ReClip's backend verbatim and layer security on top as external
  middleware. Rejected: several of the required checks (URL and option
  validation, cross-site guard) need to run inside the request handlers
  themselves to see the parsed request body, not just the raw HTTP request.
