import { DEFAULT_PREFERENCES } from '@/state/reducer';
import type { HistoryEntry, Preferences, QueueItem } from '@/state/types';
import { PREFERENCES_STORAGE_KEY } from './theme';

export { DEFAULT_PREFERENCES };

const ITEMS_STORAGE_KEY = 'openmedia.queue';
const HISTORY_STORAGE_KEY = 'openmedia.history';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPersisted(): {
  preferences: Preferences;
  items: QueueItem[];
  history: HistoryEntry[];
} {
  const stored = read<Partial<Preferences>>(PREFERENCES_STORAGE_KEY, {});
  return {
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(typeof stored === 'object' && stored !== null ? stored : {}),
    },
    items: read<QueueItem[]>(ITEMS_STORAGE_KEY, []).filter(
      (item) => item.type === 'ready' || item.type === 'job',
    ),
    history: read<HistoryEntry[]>(HISTORY_STORAGE_KEY, []),
  };
}

export function savePreferences(preferences: Preferences): boolean {
  return write(PREFERENCES_STORAGE_KEY, preferences);
}

export function saveItems(items: readonly QueueItem[]): boolean {
  return write(
    ITEMS_STORAGE_KEY,
    items.filter((item) => item.type === 'ready' || item.type === 'job'),
  );
}

export function saveHistory(history: readonly HistoryEntry[]): boolean {
  return write(HISTORY_STORAGE_KEY, history);
}
