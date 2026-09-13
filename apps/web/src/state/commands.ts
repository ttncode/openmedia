import { api, ApiRequestError } from '@/lib/api/client';
import type { RuntimeSettings } from '@/lib/api/types';
import { hasPlaylist } from '@/lib/links';
import { toDownloadRequest } from './options';
import type { Action, AppState, Notice, PlaylistScope } from './types';

type Dispatch = (action: Action) => void;
type NoticeInput = Omit<Notice, 'id'>;

export interface Commands {
  notify(notice: NoticeInput): void;
  fetchLinks(urls: readonly string[], scope: PlaylistScope): Promise<void>;
  startDownload(itemId: string): Promise<void>;
  startAllReady(): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
  retryFetch(itemId: string): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  downloadAgain(entryId: string): Promise<void>;
  syncJobs(): Promise<void>;
  loadServerState(): Promise<void>;
  saveSettings(patch: Partial<RuntimeSettings>): Promise<void>;
  uploadCookies(file: File): Promise<void>;
  removeCookies(): Promise<void>;
  signIn(password: string): Promise<boolean>;
  signOut(): Promise<void>;
}

let noticeSequence = 0;
let itemSequence = 0;

const nextItemId = (): string =>
  `item-${Date.now().toString(36)}-${(itemSequence += 1)}`;

function errorCode(error: unknown): string {
  return error instanceof ApiRequestError ? error.code : 'unknown_error';
}

export function createCommands(
  dispatch: Dispatch,
  getState: () => AppState,
): Commands {
  const notify = (notice: NoticeInput): void =>
    dispatch({
      type: 'notice/shown',
      notice: { ...notice, id: (noticeSequence += 1) },
    });
  const fail = (error: unknown): void =>
    notify({ tone: 'error', message: errorCode(error) });
  const guarded = async (work: () => Promise<void>): Promise<void> => {
    try {
      await work();
    } catch (error) {
      fail(error);
    }
  };

  const fetchOne = async (url: string): Promise<void> => {
    const id = nextItemId();
    dispatch({ type: 'fetch/started', id, url });
    try {
      dispatch({ type: 'fetch/succeeded', id, url, info: await api.info(url) });
    } catch (error) {
      dispatch({ type: 'fetch/failed', id, code: errorCode(error) });
    }
  };

  const expand = async (
    urls: readonly string[],
    scope: PlaylistScope,
  ): Promise<string[]> => {
    const expanded = await Promise.all(
      urls.map(async (url) =>
        scope === 'playlist' && hasPlaylist(url)
          ? [...(await api.playlist(url)).urls]
          : [url],
      ),
    );
    return expanded.flat();
  };

  const syncJobs = async (): Promise<void> => {
    const requestedAt = Date.now();
    const jobs = await api.jobs();
    dispatch({ type: 'jobs/synced', jobs, requestedAt });
  };

  const startDownload = async (itemId: string): Promise<void> =>
    guarded(async () => {
      const item = getState().items.find(
        (candidate) => candidate.id === itemId,
      );
      if (!item || item.type !== 'ready') return;
      const { job } = await api.download(toDownloadRequest(item));
      dispatch({ type: 'download/started', itemId, job, linkedAt: Date.now() });
    });

  return {
    notify,
    syncJobs: () => guarded(syncJobs),
    fetchLinks: (urls, scope) =>
      guarded(async () => {
        const targets = await expand(urls, scope);
        await Promise.all(targets.map(fetchOne));
        const ready = getState().items.filter(
          (item) => item.type === 'ready',
        ).length;
        if (ready > 0)
          notify({
            tone: 'success',
            message: targets.length > urls.length ? 'playlistAdded' : 'fetched',
            count: targets.length,
          });
      }),
    startDownload,
    startAllReady: async () => {
      const readyIds = getState()
        .items.filter((item) => item.type === 'ready')
        .map((item) => item.id);
      for (const id of readyIds) await startDownload(id);
    },
    cancelJob: (jobId) =>
      guarded(async () => {
        await api.removeJob(jobId);
        dispatch({ type: 'job/cancelled', jobId });
        notify({ tone: 'info', message: 'cancelled' });
      }),
    retryJob: (jobId) =>
      guarded(async () => {
        await api.removeJob(jobId);
        dispatch({ type: 'job/cancelled', jobId });
        await startDownload(jobId);
      }),
    retryFetch: (itemId) =>
      guarded(async () => {
        const item = getState().items.find(
          (candidate) => candidate.id === itemId,
        );
        if (!item || item.type !== 'fetch-error') return;
        dispatch({ type: 'item/removed', id: itemId });
        await fetchOne(item.url);
      }),
    removeItem: (itemId) =>
      guarded(async () => {
        const item = getState().items.find(
          (candidate) => candidate.id === itemId,
        );
        if (item?.type === 'job') await api.removeJob(itemId);
        dispatch({ type: 'item/removed', id: itemId });
      }),
    downloadAgain: (entryId) =>
      guarded(async () => {
        const entry = getState().history.find(
          (candidate) => candidate.id === entryId,
        );
        if (!entry) return;
        dispatch({ type: 'view/changed', view: 'queue', filter: 'all' });
        await fetchOne(entry.url);
        notify({ tone: 'success', message: 'addedAgain' });
      }),
    loadServerState: () =>
      guarded(async () => {
        const session = await api.session();
        dispatch({ type: 'session/loaded', session });
        if (session.auth_required && !session.authenticated) return;
        const [settings, storage, cookies] = await Promise.all([
          api.settings(),
          api.storage(),
          api.cookies(),
        ]);
        dispatch({ type: 'settings/loaded', settings });
        dispatch({ type: 'storage/loaded', storage });
        dispatch({ type: 'cookies/loaded', cookies });
        await syncJobs();
      }),
    saveSettings: (patch) =>
      guarded(async () => {
        dispatch({
          type: 'settings/loaded',
          settings: await api.updateSettings(patch),
        });
      }),
    uploadCookies: (file) =>
      guarded(async () => {
        dispatch({
          type: 'cookies/loaded',
          cookies: await api.uploadCookies(file),
        });
        notify({ tone: 'success', message: 'cookiesLoaded' });
      }),
    removeCookies: () =>
      guarded(async () => {
        await api.removeCookies();
        dispatch({
          type: 'cookies/loaded',
          cookies: {
            present: false,
            domains: [],
            expires_at: null,
            uploaded_at: null,
          },
        });
        notify({ tone: 'info', message: 'cookiesRemoved' });
      }),
    signIn: async (password) => {
      try {
        await api.signIn(password);
        dispatch({ type: 'session/loaded', session: await api.session() });
        return true;
      } catch (error) {
        if (errorCode(error) !== 'invalid_password') fail(error);
        return false;
      }
    },
    signOut: () =>
      guarded(async () => {
        await api.signOut();
        dispatch({ type: 'session/loaded', session: await api.session() });
      }),
  };
}
