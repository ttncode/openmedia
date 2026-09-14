import { describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError } from '@/lib/api/client';
import { createCommands } from './commands';
import { initialState, reducer } from './reducer';
import type { Action, AppState } from './types';

function harness(): {
  commands: ReturnType<typeof createCommands>;
  state: () => AppState;
} {
  let state = initialState();
  const dispatch = (action: Action): void => {
    state = reducer(state, action);
  };
  return {
    commands: createCommands(dispatch, () => state),
    state: () => state,
  };
}

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

  it('starts a download and cancels it back to ready', async () => {
    vi.spyOn(api, 'info').mockResolvedValue(INFO);
    const job = {
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
    vi.spyOn(api, 'download').mockResolvedValue({ job_id: 'j1', job });
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
});
