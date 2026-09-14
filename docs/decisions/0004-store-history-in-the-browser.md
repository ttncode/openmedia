# 0004 — Store history in the browser

Status: Accepted
Date: 2026-09-14

## Context

Once a download finishes, something needs to remember it happened, so a user
can find it again or download it a second time without re-fetching the info.
OpenMedia has no user accounts, and the server already deletes files after
the retention period.

## Decision

`apps/web/src/lib/preferences.ts` stores history and ready (not-yet-started)
queue items in the browser's `localStorage`, newest first, capped at 200
entries. "Download again" re-runs `/api/info` for the stored URL rather than
reaching for a server-side record. There is no database and no accounts on
the server.

## Consequences

Anyone with access to the web origin can start downloads, since nothing
identifies who is asking; per-user history follows the same rule. History is
local to one browser: it does not sync across devices, and clearing browser
data clears it. This matches a self-hosted, single-instance tool with no
login system, and keeps the server stateless with respect to who downloaded
what.

## Alternatives considered

- A server-side history table keyed by session or account. Rejected: would
  require adding accounts (or trusting an unauthenticated session identifier)
  and a database, for a feature that a small `localStorage` list already
  covers for the intended single-user or trusted-group use case.
