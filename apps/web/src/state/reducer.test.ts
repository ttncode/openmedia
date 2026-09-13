import { describe, expect, it } from 'vitest';
import type { Job, MediaInfo } from '@/lib/api/types';
import { countItems, initialState, reducer, visibleItems } from './reducer';
import type { AppState } from './types';

const INFO: MediaInfo = {
  id: 'a',
  title: 'Pho',
  thumbnail: 'https://i.ytimg.com/a.jpg',
  duration: 1122,
  uploader: 'Bep',
  platform: 'Youtube',
  webpage_url: 'https://youtu.be/a',
  formats: [
    {
      id: '137',
      label: '1080p',
      height: 1080,
      ext: 'mp4',
      filesize: 412_000_000,
    },
  ],
  subtitle_languages: [],
  has_chapters: false,
};

function job(overrides: Partial<Job> = {}): Job {
  return {
    job_id: 'j1',
    url: 'https://youtu.be/a',
    title: 'Pho',
    status: 'downloading',
    progress: 40,
    speed_bps: 1,
    eta_seconds: 9,
    downloaded_bytes: 1,
    total_bytes: 2,
    queue_position: 0,
    options: {
      kind: 'video',
      container: 'mp4',
      quality_height: 1080,
      format_id: '137',
      audio_format: null,
      audio_quality: null,
      trim: null,
      subtitles: null,
      embed_metadata: true,
    },
    filename: null,
    files: [],
    error: null,
    error_code: null,
    created_at: '2026-09-14T08:00:00Z',
    finished_at: null,
    expires_at: null,
    ...overrides,
  };
}

function withReadyItem(): AppState {
  const fetching = reducer(initialState(), {
    type: 'fetch/started',
    id: 'r1',
    url: 'https://youtu.be/a',
  });
  return reducer(fetching, {
    type: 'fetch/succeeded',
    id: 'r1',
    url: 'https://youtu.be/a',
    info: INFO,
  });
}

describe('reducer', () => {
  it('turns a fetched link into a selected ready item with default options', () => {
    const state = withReadyItem();
    expect(state.items[0]).toMatchObject({
      type: 'ready',
      id: 'r1',
      media: { title: 'Pho', platform: 'youtube' },
      options: { qualityHeight: 1080 },
    });
    expect(state.selectedId).toBe('r1');
  });

  it('records fetch failures', () => {
    const state = reducer(
      reducer(initialState(), {
        type: 'fetch/started',
        id: 'x',
        url: 'https://x.y/z',
      }),
      { type: 'fetch/failed', id: 'x', code: 'unsupported_url' },
    );
    expect(state.items[0]).toEqual({
      type: 'fetch-error',
      id: 'x',
      url: 'https://x.y/z',
      code: 'unsupported_url',
    });
  });

  it('changes options on a ready item', () => {
    const state = reducer(withReadyItem(), {
      type: 'item/optionsChanged',
      id: 'r1',
      patch: { kind: 'audio' },
    });
    expect(state.items[0]).toMatchObject({ options: { kind: 'audio' } });
  });

  it('links a started download and follows server updates into history', () => {
    const started = reducer(withReadyItem(), {
      type: 'download/started',
      itemId: 'r1',
      job: job(),
    });
    expect(started.items[0]).toMatchObject({ type: 'job', id: 'j1' });
    expect(started.selectedId).toBe('j1');
    const done = reducer(started, {
      type: 'jobs/synced',
      jobs: [
        job({
          status: 'done',
          progress: 100,
          files: [
            { index: 0, name: 'Pho.mp4', kind: 'media', size_bytes: 412 },
          ],
          finished_at: '2026-09-14T08:05:00Z',
        }),
      ],
    });
    expect(done.items[0]).toMatchObject({ job: { status: 'done' } });
    expect(done.history).toEqual([
      {
        id: 'j1',
        url: 'https://youtu.be/a',
        title: 'Pho',
        kind: 'video',
        label: 'MP4 1080p',
        sizeBytes: 412,
        finishedAt: '2026-09-14T08:05:00Z',
      },
    ]);
    const again = reducer(done, {
      type: 'jobs/synced',
      jobs: [job({ status: 'done', finished_at: '2026-09-14T08:05:00Z' })],
    });
    expect(again.history).toHaveLength(1);
  });

  it('adopts server jobs it did not start and drops jobs the server forgot', () => {
    const adopted = reducer(initialState(), {
      type: 'jobs/synced',
      jobs: [job({ job_id: 'remote', status: 'queued' })],
    });
    expect(adopted.items[0]).toMatchObject({
      type: 'job',
      id: 'remote',
      media: { title: 'Pho', platform: 'youtube' },
    });
    expect(reducer(adopted, { type: 'jobs/synced', jobs: [] }).items).toEqual(
      [],
    );
  });

  it('ignores cancelled jobs from the server', () => {
    expect(
      reducer(initialState(), {
        type: 'jobs/synced',
        jobs: [job({ status: 'cancelled' })],
      }).items,
    ).toEqual([]);
  });

  it('returns a cancelled job to a ready item', () => {
    const started = reducer(withReadyItem(), {
      type: 'download/started',
      itemId: 'r1',
      job: job(),
    });
    const cancelled = reducer(started, { type: 'job/cancelled', jobId: 'j1' });
    expect(cancelled.items[0]).toMatchObject({
      type: 'ready',
      id: 'j1',
      options: { qualityHeight: 1080 },
    });
  });

  it('filters and counts', () => {
    const started = reducer(withReadyItem(), {
      type: 'download/started',
      itemId: 'r1',
      job: job(),
    });
    const withError = reducer(started, {
      type: 'fetch/started',
      id: 'e',
      url: 'https://x.y',
    });
    const failed = reducer(withError, {
      type: 'fetch/failed',
      id: 'e',
      code: 'unavailable',
    });
    expect(countItems(failed)).toEqual({
      all: 2,
      active: 1,
      done: 0,
      error: 1,
    });
    const filtered = reducer(failed, {
      type: 'view/changed',
      view: 'queue',
      filter: 'error',
    });
    expect(visibleItems(filtered).map((item) => item.id)).toEqual(['e']);
  });

  it('clears history and shows notices', () => {
    const noticed = reducer(initialState(), {
      type: 'notice/shown',
      notice: { id: 7, tone: 'info', message: 'hi' },
    });
    expect(noticed.notice?.id).toBe(7);
    expect(
      reducer(noticed, { type: 'notice/dismissed', id: 7 }).notice,
    ).toBeNull();
  });
});
