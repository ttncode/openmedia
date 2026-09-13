import type { Job, MediaInfo } from '@/lib/api/types';
import { detectPlatform } from '@/lib/links';
import { defaultDraft } from './options';
import type {
  Action,
  AppState,
  DraftOptions,
  Filter,
  HistoryEntry,
  JobItem,
  MediaSnapshot,
  Preferences,
  QueueItem,
} from './types';

export const MAX_HISTORY_ENTRIES = 200;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  accent: 'teal',
  language: 'auto',
  defaultFormat: 'video-mp4-1080',
  installHintDismissed: false,
};

const ACTIVE_STATUSES = new Set(['queued', 'downloading', 'processing']);

export function initialState(
  preferences: Preferences = DEFAULT_PREFERENCES,
): AppState {
  return {
    items: [],
    selectedId: null,
    view: 'queue',
    filter: 'all',
    history: [],
    session: null,
    settings: null,
    storage: null,
    cookies: null,
    preferences,
    notice: null,
  };
}

function snapshotFromInfo(url: string, info: MediaInfo): MediaSnapshot {
  return {
    url,
    title: info.title || url,
    thumbnail: info.thumbnail,
    duration: info.duration,
    uploader: info.uploader,
    platform: detectPlatform(url),
  };
}

function snapshotFromJob(job: Job): MediaSnapshot {
  return {
    url: job.url,
    title: job.title || job.url,
    thumbnail: '',
    duration: null,
    uploader: '',
    platform: detectPlatform(job.url),
  };
}

function draftFromJob(job: Job): DraftOptions {
  const { options } = job;
  return {
    kind: options.kind,
    container: options.container,
    qualityHeight: options.quality_height,
    audioFormat: options.audio_format ?? 'm4a',
    audioQuality: options.audio_quality ?? 'best',
    trim: options.trim,
    subtitleLanguages: options.subtitles?.languages ?? [],
    subtitleMode: options.subtitles?.mode ?? 'embed',
    embedMetadata: options.embed_metadata,
  };
}

function jobLabel(job: Job): string {
  const { options } = job;
  if (options.kind === 'audio')
    return (options.audio_format ?? 'mp3').toUpperCase();
  return `${options.container.toUpperCase()}${options.quality_height ? ` ${options.quality_height}p` : ''}`;
}

function historyEntry(job: Job): HistoryEntry {
  return {
    id: job.job_id,
    url: job.url,
    title: job.title || job.url,
    kind: job.options.kind,
    label: jobLabel(job),
    sizeBytes: job.files[0]?.size_bytes ?? 0,
    finishedAt: job.finished_at ?? job.created_at,
  };
}

function replaceItem(
  items: readonly QueueItem[],
  id: string,
  next: QueueItem,
): QueueItem[] {
  return items.map((item) => (item.id === id ? next : item));
}

function mergeJob(existing: JobItem | undefined, job: Job): JobItem {
  if (existing) return { ...existing, job };
  return {
    type: 'job',
    id: job.job_id,
    media: snapshotFromJob(job),
    formats: [],
    options: draftFromJob(job),
    job,
  };
}

function syncJobs(state: AppState, jobs: readonly Job[]): AppState {
  const liveJobs = jobs.filter((job) => job.status !== 'cancelled');
  const jobIds = new Set(liveJobs.map((job) => job.job_id));
  const existingJobs = new Map(
    state.items
      .filter((item): item is JobItem => item.type === 'job')
      .map((item) => [item.id, item]),
  );
  const kept = state.items.filter(
    (item) => item.type !== 'job' || jobIds.has(item.id),
  );
  const known = new Set(kept.map((item) => item.id));
  const adopted = liveJobs
    .filter((job) => !known.has(job.job_id))
    .map((job) => mergeJob(undefined, job));
  const liveById = new Map(liveJobs.map((job) => [job.job_id, job]));
  const merged = kept.map((item) => {
    const live = item.type === 'job' ? liveById.get(item.id) : undefined;
    return item.type === 'job' && live
      ? mergeJob(existingJobs.get(item.id), live)
      : item;
  });
  const newlyDone = liveJobs.filter(
    (job) =>
      job.status === 'done' &&
      !state.history.some((entry) => entry.id === job.job_id),
  );
  const history = [...newlyDone.map(historyEntry), ...state.history].slice(
    0,
    MAX_HISTORY_ENTRIES,
  );
  return { ...state, items: [...adopted, ...merged], history };
}

function startDownload(state: AppState, itemId: string, job: Job): AppState {
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item || item.type !== 'ready') return state;
  const next: JobItem = {
    type: 'job',
    id: job.job_id,
    media: item.media,
    formats: item.formats,
    options: item.options,
    job,
  };
  return {
    ...state,
    items: replaceItem(state.items, itemId, next),
    selectedId: state.selectedId === itemId ? job.job_id : state.selectedId,
  };
}

function cancelJob(state: AppState, jobId: string): AppState {
  const item = state.items.find((candidate) => candidate.id === jobId);
  if (!item || item.type !== 'job') return state;
  return {
    ...state,
    items: replaceItem(state.items, jobId, {
      type: 'ready',
      id: item.id,
      media: item.media,
      formats: item.formats,
      options: item.options,
    }),
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'fetch/started':
      return {
        ...state,
        items: [
          { type: 'fetching', id: action.id, url: action.url },
          ...state.items,
        ],
      };
    case 'fetch/succeeded': {
      const ready: QueueItem = {
        type: 'ready',
        id: action.id,
        media: snapshotFromInfo(action.url, action.info),
        formats: action.info.formats,
        options: defaultDraft(
          state.preferences.defaultFormat,
          action.info.formats,
        ),
      };
      return {
        ...state,
        items: replaceItem(state.items, action.id, ready),
        selectedId: action.id,
      };
    }
    case 'fetch/failed': {
      const item = state.items.find((candidate) => candidate.id === action.id);
      return item
        ? {
            ...state,
            items: replaceItem(state.items, action.id, {
              type: 'fetch-error',
              id: action.id,
              url: item.type === 'fetching' ? item.url : '',
              code: action.code,
            }),
          }
        : state;
    }
    case 'item/selected':
      return { ...state, selectedId: action.id };
    case 'item/optionsChanged':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id && item.type === 'ready'
            ? { ...item, options: { ...item.options, ...action.patch } }
            : item,
        ),
      };
    case 'item/removed':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case 'download/started':
      return startDownload(state, action.itemId, action.job);
    case 'job/cancelled':
      return cancelJob(state, action.jobId);
    case 'jobs/synced':
      return syncJobs(state, action.jobs);
    case 'history/cleared':
      return { ...state, history: [] };
    case 'view/changed':
      return {
        ...state,
        view: action.view,
        filter: action.filter ?? state.filter,
      };
    case 'session/loaded':
      return { ...state, session: action.session };
    case 'settings/loaded':
      return { ...state, settings: action.settings };
    case 'storage/loaded':
      return { ...state, storage: action.storage };
    case 'cookies/loaded':
      return { ...state, cookies: action.cookies };
    case 'preferences/changed':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.patch },
      };
    case 'notice/shown':
      return { ...state, notice: action.notice };
    case 'notice/dismissed':
      return state.notice?.id === action.id
        ? { ...state, notice: null }
        : state;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

const FILTERS: Record<Filter, (item: QueueItem) => boolean> = {
  all: () => true,
  active: (item) =>
    item.type === 'fetching' ||
    (item.type === 'job' && ACTIVE_STATUSES.has(item.job.status)),
  done: (item) => item.type === 'job' && item.job.status === 'done',
  error: (item) =>
    item.type === 'fetch-error' ||
    (item.type === 'job' && item.job.status === 'error'),
};

export function visibleItems(state: AppState): QueueItem[] {
  return state.items.filter(FILTERS[state.filter]);
}

export function countItems(state: AppState): Record<Filter, number> {
  const settled = state.items.filter((item) => item.type !== 'fetching');
  return {
    all: settled.length,
    active: settled.filter(FILTERS.active).length,
    done: settled.filter(FILTERS.done).length,
    error: settled.filter(FILTERS.error).length,
  };
}

export function selectedItem(state: AppState): QueueItem | null {
  return state.items.find((item) => item.id === state.selectedId) ?? null;
}
