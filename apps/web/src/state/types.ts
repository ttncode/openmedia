import type {
  AudioFormat,
  AudioQuality,
  Container,
  CookieSummary,
  DownloadKind,
  Job,
  MediaFormat,
  MediaInfo,
  RuntimeSettings,
  SessionInfo,
  StorageUsage,
  SubtitleMode,
  TrimRange,
} from '@/lib/api/types';
import type { LanguagePreference } from '@/lib/i18n/I18nProvider';
import type { PlatformId } from '@/lib/links';
import type { AccentId, ThemePreference } from '@/lib/theme';

export type Filter = 'all' | 'active' | 'done' | 'error';
export type View = 'queue' | 'history';
export type DefaultFormatId =
  'video-mp4-1080' | 'video-mp4-720' | 'audio-m4a' | 'audio-mp3';
export type PlaylistScope = 'single' | 'playlist';

export interface DraftOptions {
  readonly kind: DownloadKind;
  readonly container: Container;
  readonly qualityHeight: number | null;
  readonly audioFormat: AudioFormat;
  readonly audioQuality: AudioQuality;
  readonly trim: TrimRange | null;
  readonly subtitleLanguages: readonly string[];
  readonly subtitleMode: SubtitleMode;
  readonly embedMetadata: boolean;
}

export interface MediaSnapshot {
  readonly url: string;
  readonly title: string;
  readonly thumbnail: string;
  readonly duration: number | null;
  readonly uploader: string;
  readonly platform: PlatformId;
}

export interface FetchingItem {
  readonly type: 'fetching';
  readonly id: string;
  readonly url: string;
}

export interface FetchErrorItem {
  readonly type: 'fetch-error';
  readonly id: string;
  readonly url: string;
  readonly code: string;
}

export interface ReadyItem {
  readonly type: 'ready';
  readonly id: string;
  readonly media: MediaSnapshot;
  readonly formats: readonly MediaFormat[];
  readonly options: DraftOptions;
}

export interface JobItem {
  readonly type: 'job';
  readonly id: string;
  readonly media: MediaSnapshot;
  readonly formats: readonly MediaFormat[];
  readonly options: DraftOptions;
  readonly job: Job;
}

export type QueueItem = FetchingItem | FetchErrorItem | ReadyItem | JobItem;

export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly kind: DownloadKind;
  readonly label: string;
  readonly sizeBytes: number;
  readonly finishedAt: string;
}

export interface Preferences {
  readonly theme: ThemePreference;
  readonly accent: AccentId;
  readonly language: LanguagePreference;
  readonly defaultFormat: DefaultFormatId;
  readonly installHintDismissed: boolean;
}

export interface Notice {
  readonly id: number;
  readonly tone: 'success' | 'info' | 'error';
  readonly message: string;
  readonly detail?: string;
  readonly count?: number;
}

export interface AppState {
  readonly items: readonly QueueItem[];
  readonly selectedId: string | null;
  readonly view: View;
  readonly filter: Filter;
  readonly history: readonly HistoryEntry[];
  readonly session: SessionInfo | null;
  readonly settings: RuntimeSettings | null;
  readonly storage: StorageUsage | null;
  readonly cookies: CookieSummary | null;
  readonly preferences: Preferences;
  readonly notice: Notice | null;
}

export type Action =
  | {
      readonly type: 'fetch/started';
      readonly id: string;
      readonly url: string;
    }
  | {
      readonly type: 'fetch/succeeded';
      readonly id: string;
      readonly url: string;
      readonly info: MediaInfo;
    }
  | {
      readonly type: 'fetch/failed';
      readonly id: string;
      readonly code: string;
    }
  | { readonly type: 'item/selected'; readonly id: string | null }
  | {
      readonly type: 'item/optionsChanged';
      readonly id: string;
      readonly patch: Partial<DraftOptions>;
    }
  | { readonly type: 'item/removed'; readonly id: string }
  | {
      readonly type: 'download/started';
      readonly itemId: string;
      readonly job: Job;
    }
  | { readonly type: 'job/cancelled'; readonly jobId: string }
  | { readonly type: 'jobs/synced'; readonly jobs: readonly Job[] }
  | { readonly type: 'history/cleared' }
  | {
      readonly type: 'view/changed';
      readonly view: View;
      readonly filter?: Filter;
    }
  | { readonly type: 'session/loaded'; readonly session: SessionInfo }
  | { readonly type: 'settings/loaded'; readonly settings: RuntimeSettings }
  | { readonly type: 'storage/loaded'; readonly storage: StorageUsage }
  | { readonly type: 'cookies/loaded'; readonly cookies: CookieSummary }
  | {
      readonly type: 'preferences/changed';
      readonly patch: Partial<Preferences>;
    }
  | { readonly type: 'notice/shown'; readonly notice: Notice }
  | { readonly type: 'notice/dismissed'; readonly id: number };
