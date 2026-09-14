# 0003 — Keep jobs in memory with one worker

Status: Accepted
Date: 2026-09-14

## Context

Downloads run as background jobs: queued, dispatched when a concurrency slot
is free, tracked for progress, and cancellable. Something has to hold that
state and run the yt-dlp processes.

## Decision

`apps/api/app/jobs.py`'s `JobManager` holds the job registry in memory and
runs downloads on worker threads, with gunicorn configured for one worker
process and eight threads (`--workers 1 --threads 8`). A restart of the
container loses any job that was active, queued or otherwise not yet
finished. The retention sweeper cleans up finished job files independently
of the process holding job state.

## Consequences

There is no database, message broker or extra service to run, deploy or back
up: the whole job system is a few in-process data structures. The tradeoff is
that a container restart (a deploy, a crash, a host reboot) silently drops
in-flight downloads; the operator-facing documentation says so. Because
there is exactly one worker process, in-memory state never needs to be
shared or synchronized across processes, which is what makes threads safe
here: running more than one worker process would require moving job state
out of memory first.

## Alternatives considered

- SQLite-backed job table. Rejected: survives a restart, but adds a schema,
  migrations and a durability guarantee nothing in OpenMedia's use case
  needs; a dropped in-flight download is a re-click, not data loss.
- A Redis-backed queue (Celery or similar). Rejected: a second service to
  run and keep healthy, for a workload (one self-hosted instance,
  `OPENMEDIA_MAX_CONCURRENT` capped at 5) that never approaches the scale
  where a distributed queue earns its complexity.
