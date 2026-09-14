import { describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError } from '@/lib/api/client';
import { createCommands } from './commands';
import { initialState, reducer } from './reducer';
import type { Action, AppState } from './types';

function harness(): {
  commands: ReturnType<typeof createCommands>;
  state: () => AppState;
  notices: () => number;
} {
  let state = initialState();
  let noticeCount = 0;
  const dispatch = (action: Action): void => {
    if (action.type === 'notice/shown') noticeCount += 1;
    state = reducer(state, action);
  };
  return {
    commands: createCommands(dispatch, () => state),
    state: () => state,
    notices: () => noticeCount,
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

const SIGNED_OUT = {
  auth_required: true,
  authenticated: false,
  limits: { max_filesize_mb: 1, max_playlist_items: 1 },
};

const unreachable = (): ApiRequestError =>
  new ApiRequestError(0, 'api_unreachable', 'down', null);
const expired = (): ApiRequestError =>
  new ApiRequestError(401, 'auth_required', 'Sign in to continue.', null);

const INFO = {
  id: 'a',
  title: 'Pho',
  thumbnail: '',
  duration: 60,
  uploader: '',
  platform: 'Youtube',
  webpage_url: '',
  formats: [],
  subtitle_languages: [],
  has_chapters: false,
  is_playlist: false,
};

const JOB = {
  job_id: 'j1',
  url: 'https://youtu.be/a',
  title: 'Pho',
  status: 'queued',
  progress: 0,
  speed_bps: null,
  eta_seconds: null,
  downloaded_bytes: null,
  total_bytes: null,
  queue_position: 1,
  options: {
    kind: 'video',
    container: 'mp4',
    quality_height: null,
    format_id: null,
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
  created_at: '2026-09-14T00:00:00Z',
  finished_at: null,
  expires_at: null,
} as const;

describe('commands', () => {
  it('fetches each link and records failures with their codes', async () => {
    vi.spyOn(api, 'info').mockImplementation(async (url) => {
      if (url.includes('bad'))
        throw new ApiRequestError(400, 'unsupported_url', 'no', null);
      return INFO;
    });
    const { commands, state } = harness();
    await commands.fetchLinks(
      ['https://youtu.be/a', 'https://bad.example/x'],
      'single',
    );
    expect(
      state()
        .items.map((item) => item.type)
        .sort(),
    ).toEqual(['fetch-error', 'ready']);
  });

  it('announces info only when the new links produced ready items', async () => {
    vi.spyOn(api, 'info').mockImplementation(async (url) => {
      if (url.includes('bad'))
        throw new ApiRequestError(400, 'private_network', 'no', null);
      return INFO;
    });
    const { commands, state } = harness();
    await commands.fetchLinks(['https://youtu.be/a'], 'single');
    const firstNotice = state().notice;
    await commands.fetchLinks(['https://bad.example/x'], 'single');
    expect(state().notice).toBe(firstNotice);
  });

  it('expands playlists before fetching', async () => {
    vi.spyOn(api, 'playlist').mockResolvedValue({
      title: 'Mix',
      count: 2,
      urls: ['https://youtu.be/1', 'https://youtu.be/2'],
    });
    const info = vi.spyOn(api, 'info').mockResolvedValue(INFO);
    const { commands } = harness();
    await commands.fetchLinks(
      ['https://www.youtube.com/watch?v=a&list=PL1'],
      'playlist',
    );
    expect(info).toHaveBeenCalledTimes(2);
  });

  it('runs at most three info requests at once across links and playlist entries', async () => {
    let running = 0;
    let peak = 0;
    const info = vi.spyOn(api, 'info').mockImplementation(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return INFO;
    });
    vi.spyOn(api, 'playlist').mockResolvedValue({
      title: 'Mix',
      count: 5,
      urls: [1, 2, 3, 4, 5].map((entry) => `https://youtu.be/p${entry}`),
    });
    const { commands, state } = harness();
    await commands.fetchLinks(
      [
        'https://www.youtube.com/watch?v=a&list=PL1',
        'https://youtu.be/a',
        'https://youtu.be/b',
        'https://youtu.be/c',
      ],
      'playlist',
    );
    expect(info).toHaveBeenCalledTimes(8);
    expect(peak).toBe(3);
    expect(state().items.filter((item) => item.type === 'ready')).toHaveLength(
      8,
    );
  });

  it('adds the entries of a link that resolves to a playlist', async () => {
    const album = 'https://archive.org/details/fables';
    vi.spyOn(api, 'info').mockImplementation(async (url) =>
      url === album ? { ...INFO, is_playlist: true } : INFO,
    );
    const playlist = vi.spyOn(api, 'playlist').mockResolvedValue({
      title: 'Fables',
      count: 2,
      urls: [
        'https://archive.org/download/fables/1.mp3',
        'https://archive.org/download/fables/2.mp3',
      ],
    });
    const { commands, state } = harness();
    await commands.fetchLinks([album], 'single');
    expect(playlist).toHaveBeenCalledWith(album);
    expect(state().items.map((item) => item.type)).toEqual(['ready', 'ready']);
    expect(state().notice).toMatchObject({
      message: 'playlistAdded',
      count: 2,
    });
  });

  it('expands only one level and marks nested playlists as errors', async () => {
    const album = 'https://archive.org/details/fables';
    const nested = 'https://archive.org/details/fables/more';
    vi.spyOn(api, 'info').mockImplementation(async (url) =>
      url === album || url === nested ? { ...INFO, is_playlist: true } : INFO,
    );
    const playlist = vi.spyOn(api, 'playlist').mockResolvedValue({
      title: 'Fables',
      count: 2,
      urls: [nested, 'https://archive.org/download/fables/1.mp3'],
    });
    const { commands, state } = harness();
    await commands.fetchLinks([album], 'single');
    expect(playlist).toHaveBeenCalledTimes(1);
    expect(
      state()
        .items.map((item) =>
          item.type === 'fetch-error' ? item.code : item.type,
        )
        .sort(),
    ).toEqual(['nested_playlist', 'ready']);
  });

  it('keeps an error row for a playlist that lists only itself', async () => {
    const album = 'https://archive.org/details/empty';
    const info = vi
      .spyOn(api, 'info')
      .mockResolvedValue({ ...INFO, is_playlist: true });
    vi.spyOn(api, 'playlist').mockResolvedValue({
      title: 'Empty',
      count: 1,
      urls: [album],
    });
    const { commands, state } = harness();
    await commands.fetchLinks([album], 'single');
    expect(info).toHaveBeenCalledTimes(1);
    expect(state().items).toEqual([
      {
        type: 'fetch-error',
        id: expect.any(String),
        url: album,
        code: 'empty_playlist',
      },
    ]);
  });

  it('starts a download and cancels it back to ready', async () => {
    vi.spyOn(api, 'info').mockResolvedValue(INFO);
    vi.spyOn(api, 'download').mockResolvedValue({ job_id: 'j1', job: JOB });
    const remove = vi.spyOn(api, 'removeJob').mockResolvedValue(undefined);
    const { commands, state } = harness();
    await commands.fetchLinks(['https://youtu.be/a'], 'single');
    await commands.startDownload(state().items[0].id);
    expect(state().items[0]).toMatchObject({ type: 'job', id: 'j1' });
    await commands.cancelJob('j1');
    expect(remove).toHaveBeenCalledWith('j1');
    expect(state().items[0].type).toBe('ready');
  });

  it('refreshes storage usage whenever jobs are synced', async () => {
    vi.spyOn(api, 'jobs').mockResolvedValue([]);
    const usage = { used_bytes: 5_000_000, limit_bytes: null, free_bytes: 1 };
    vi.spyOn(api, 'storage').mockResolvedValue(usage);
    const { commands, state } = harness();
    await commands.syncJobs();
    expect(state().storage).toEqual(usage);
  });

  it('keeps syncing jobs silently when storage usage fails', async () => {
    const usage = { used_bytes: 5_000_000, limit_bytes: null, free_bytes: 1 };
    vi.spyOn(api, 'storage')
      .mockResolvedValueOnce(usage)
      .mockRejectedValueOnce(
        new ApiRequestError(500, 'unknown_error', 'x', null),
      );
    vi.spyOn(api, 'jobs')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([JOB]);
    const { commands, state } = harness();
    await commands.syncJobs();
    await commands.syncJobs();
    expect(state().storage).toEqual(usage);
    expect(state().notice).toBeNull();
    expect(state().items.map((item) => item.id)).toEqual(['j1']);
  });

  it('shows a localized notice code when the API fails', async () => {
    vi.spyOn(api, 'updateSettings').mockRejectedValue(
      new ApiRequestError(400, 'invalid_option', 'bad', null),
    );
    const { commands, state } = harness();
    await commands.saveSettings({ max_concurrent: 9 });
    expect(state().notice).toMatchObject({
      tone: 'error',
      message: 'invalid_option',
    });
  });

  it('shows the sign in screen when a poll finds the session expired', async () => {
    vi.spyOn(api, 'storage').mockRejectedValue(expired());
    vi.spyOn(api, 'jobs').mockRejectedValue(expired());
    vi.spyOn(api, 'session').mockResolvedValue(SIGNED_OUT);
    const { commands, state, notices } = harness();
    await commands.syncJobs();
    expect(state().session).toEqual(SIGNED_OUT);
    expect(notices()).toBe(0);
  });

  it('reloads the session when any command meets an expired session', async () => {
    vi.spyOn(api, 'updateSettings').mockRejectedValue(expired());
    vi.spyOn(api, 'session').mockResolvedValue(SIGNED_OUT);
    const { commands, state } = harness();
    await commands.saveSettings({ max_concurrent: 2 });
    expect(state().session).toEqual(SIGNED_OUT);
  });

  it('reloads the session when fetching links meets an expired session', async () => {
    vi.spyOn(api, 'info').mockRejectedValue(expired());
    const session = vi.spyOn(api, 'session').mockResolvedValue(SIGNED_OUT);
    const { commands, state } = harness();
    await commands.fetchLinks(
      ['https://youtu.be/a', 'https://youtu.be/b'],
      'single',
    );
    expect(session).toHaveBeenCalledTimes(1);
    expect(state().session).toEqual(SIGNED_OUT);
  });

  it('reports an outage once until a poll succeeds again', async () => {
    vi.spyOn(api, 'storage').mockRejectedValue(unreachable());
    const jobs = vi
      .spyOn(api, 'jobs')
      .mockRejectedValueOnce(unreachable())
      .mockRejectedValueOnce(unreachable())
      .mockRejectedValueOnce(unreachable())
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(unreachable());
    const { commands, notices } = harness();
    for (let tick = 0; tick < 3; tick += 1) await commands.syncJobs();
    expect(notices()).toBe(1);
    await commands.syncJobs();
    await commands.syncJobs();
    expect(jobs).toHaveBeenCalledTimes(5);
    expect(notices()).toBe(2);
  });

  it('skips a poll while the previous one is still running', async () => {
    vi.spyOn(api, 'storage').mockResolvedValue({
      used_bytes: 0,
      limit_bytes: null,
      free_bytes: 1,
    });
    const pending = deferred<[]>();
    const jobs = vi.spyOn(api, 'jobs').mockReturnValue(pending.promise);
    const { commands } = harness();
    const first = commands.syncJobs();
    await commands.syncJobs();
    expect(jobs).toHaveBeenCalledTimes(1);
    pending.resolve([]);
    await first;
  });

  it('keeps a removed job away when a poll from before the removal returns', async () => {
    vi.spyOn(api, 'info').mockResolvedValue(INFO);
    vi.spyOn(api, 'download').mockResolvedValue({ job_id: 'j1', job: JOB });
    vi.spyOn(api, 'removeJob').mockResolvedValue(undefined);
    vi.spyOn(api, 'storage').mockResolvedValue({
      used_bytes: 0,
      limit_bytes: null,
      free_bytes: 1,
    });
    const stalePoll = deferred<(typeof JOB)[]>();
    vi.spyOn(api, 'jobs').mockReturnValue(stalePoll.promise);
    const { commands, state } = harness();
    await commands.fetchLinks(['https://youtu.be/a'], 'single');
    await commands.startDownload(state().items[0].id);
    const poll = commands.syncJobs();
    await commands.removeItem('j1');
    stalePoll.resolve([JOB]);
    await poll;
    expect(state().items).toEqual([]);
  });
});
