export type JobStatus =
  'queued' | 'downloading' | 'processing' | 'done' | 'error' | 'cancelled';
export type DownloadKind = 'video' | 'audio';
export type Container = 'mp4' | 'mkv';
export type AudioFormat = 'mp3' | 'm4a' | 'opus' | 'flac' | 'wav';
export type AudioQuality = '320k' | 'best';
export type SubtitleMode = 'embed' | 'srt';

export interface MediaFormat {
  readonly id: string;
  readonly label: string;
  readonly height: number;
  readonly ext: string | null;
  readonly filesize: number | null;
}

export interface MediaInfo {
  readonly id: string | null;
  readonly title: string;
  readonly thumbnail: string;
  readonly duration: number | null;
  readonly uploader: string;
  readonly platform: string;
  readonly webpage_url: string;
  readonly formats: readonly MediaFormat[];
  readonly subtitle_languages: readonly string[];
  readonly has_chapters: boolean;
  readonly is_playlist: boolean;
}

export interface PlaylistInfo {
  readonly title: string;
  readonly count: number;
  readonly urls: readonly string[];
}

export interface TrimRange {
  readonly start: number;
  readonly end: number;
}

export interface SubtitleSelection {
  readonly languages: readonly string[];
  readonly mode: SubtitleMode;
}

export interface DownloadRequest {
  readonly url: string;
  readonly title: string;
  readonly format: DownloadKind;
  readonly format_id?: string;
  readonly container?: Container;
  readonly quality_height?: number;
  readonly audio_format?: AudioFormat;
  readonly audio_quality?: AudioQuality;
  readonly trim?: TrimRange;
  readonly subtitles?: SubtitleSelection;
  readonly embed_metadata: boolean;
}

export interface JobOptions {
  readonly kind: DownloadKind;
  readonly container: Container;
  readonly quality_height: number | null;
  readonly format_id: string | null;
  readonly audio_format: AudioFormat | null;
  readonly audio_quality: AudioQuality | null;
  readonly trim: TrimRange | null;
  readonly subtitles: SubtitleSelection | null;
  readonly embed_metadata: boolean;
}

export interface JobFile {
  readonly index: number;
  readonly name: string;
  readonly kind: 'media' | 'subtitle';
  readonly size_bytes: number;
}

export interface Job {
  readonly job_id: string;
  readonly url: string;
  readonly title: string;
  readonly status: JobStatus;
  readonly progress: number;
  readonly speed_bps: number | null;
  readonly eta_seconds: number | null;
  readonly downloaded_bytes: number | null;
  readonly total_bytes: number | null;
  readonly queue_position: number;
  readonly options: JobOptions;
  readonly filename: string | null;
  readonly files: readonly JobFile[];
  readonly error: string | null;
  readonly error_code: string | null;
  readonly created_at: string;
  readonly finished_at: string | null;
  readonly expires_at: string | null;
}

export interface SessionInfo {
  readonly auth_required: boolean;
  readonly authenticated: boolean;
  readonly limits: {
    readonly max_filesize_mb: number;
    readonly max_playlist_items: number;
  };
}

export interface RuntimeSettings {
  readonly retention_minutes: number;
  readonly max_concurrent: number;
}

export interface StorageUsage {
  readonly used_bytes: number;
  readonly limit_bytes: number | null;
  readonly free_bytes: number;
}

export interface CookieSummary {
  readonly present: boolean;
  readonly domains: readonly string[];
  readonly expires_at: string | null;
  readonly uploaded_at: string | null;
}

export interface ApiErrorBody {
  readonly error: string;
  readonly code: string;
}
