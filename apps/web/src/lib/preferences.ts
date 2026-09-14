import { DEFAULT_PREFERENCES } from '@/state/reducer';
import type {
  DefaultFormatId,
  HistoryEntry,
  Preferences,
  QueueItem,
} from '@/state/types';
import type { LanguagePreference } from './i18n/I18nProvider';
import {
  ACCENTS,
  PREFERENCES_STORAGE_KEY,
  type ThemePreference,
} from './theme';

export { DEFAULT_PREFERENCES };

export const DEFAULT_FORMATS: readonly DefaultFormatId[] = [
  'video-mp4-1080',
  'video-mp4-720',
  'audio-m4a',
  'audio-mp3',
];
export const LANGUAGES: readonly LanguagePreference[] = ['auto', 'vi', 'en'];

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const ACCENT_IDS = ACCENTS.map((accent) => accent.id);
const FLAGS: readonly boolean[] = [true, false];
const ITEMS_STORAGE_KEY = 'openmedia.queue';
const HISTORY_STORAGE_KEY = 'openmedia.history';

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStoredItem(value: unknown): value is QueueItem {
  return isRecord(value) && (value.type === 'ready' || value.type === 'job');
}

function isStoredHistoryEntry(value: unknown): value is HistoryEntry {
  return isRecord(value) && typeof value.id === 'string';
}

function readArray(key: string): unknown[] {
  const value = read(key);
  return Array.isArray(value) ? value : [];
}

function allowed<T>(choices: readonly T[], value: unknown, fallback: T): T {
  return choices.find((choice) => choice === value) ?? fallback;
}

function preferencesFrom(stored: unknown): Preferences {
  const record = isRecord(stored) ? stored : {};
  return {
    theme: allowed(THEMES, record.theme, DEFAULT_PREFERENCES.theme),
    accent: allowed(ACCENT_IDS, record.accent, DEFAULT_PREFERENCES.accent),
    language: allowed(LANGUAGES, record.language, DEFAULT_PREFERENCES.language),
    defaultFormat: allowed(
      DEFAULT_FORMATS,
      record.defaultFormat,
      DEFAULT_PREFERENCES.defaultFormat,
    ),
    installHintDismissed: allowed(
      FLAGS,
      record.installHintDismissed,
      DEFAULT_PREFERENCES.installHintDismissed,
    ),
  };
}

export function loadPersisted(): {
  preferences: Preferences;
  items: QueueItem[];
  history: HistoryEntry[];
} {
  return {
    preferences: preferencesFrom(read(PREFERENCES_STORAGE_KEY)),
    items: readArray(ITEMS_STORAGE_KEY).filter(isStoredItem),
    history: readArray(HISTORY_STORAGE_KEY).filter(isStoredHistoryEntry),
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
