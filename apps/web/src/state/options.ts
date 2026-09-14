import type {
  AudioFormat,
  AudioQuality,
  DownloadRequest,
  MediaFormat,
} from '@/lib/api/types';
import type { DefaultFormatId, DraftOptions, ReadyItem } from './types';

const BITS_PER_BYTE = 8;
const BITS_PER_KILOBIT = 1000;

export const AUDIO_BITRATES_KBPS: Record<
  AudioFormat,
  Record<AudioQuality, number>
> = {
  mp3: { '320k': 320, best: 245 },
  m4a: { '320k': 320, best: 160 },
  opus: { '320k': 320, best: 128 },
  flac: { '320k': 900, best: 900 },
  wav: { '320k': 1411, best: 1411 },
};

const DEFAULTS: Record<
  DefaultFormatId,
  Pick<DraftOptions, 'kind' | 'audioFormat' | 'audioQuality'> & {
    maxHeight: number;
  }
> = {
  'video-mp4-1080': {
    kind: 'video',
    audioFormat: 'm4a',
    audioQuality: 'best',
    maxHeight: 1080,
  },
  'video-mp4-720': {
    kind: 'video',
    audioFormat: 'm4a',
    audioQuality: 'best',
    maxHeight: 720,
  },
  'audio-m4a': {
    kind: 'audio',
    audioFormat: 'm4a',
    audioQuality: 'best',
    maxHeight: 1080,
  },
  'audio-mp3': {
    kind: 'audio',
    audioFormat: 'mp3',
    audioQuality: '320k',
    maxHeight: 1080,
  },
};

function bestHeightAtMost(
  formats: readonly MediaFormat[],
  maxHeight: number,
): number | null {
  const heights = formats
    .map((format) => format.height)
    .filter((height) => height <= maxHeight);
  return heights.length > 0
    ? Math.max(...heights)
    : (formats[formats.length - 1]?.height ?? null);
}

export function defaultDraft(
  defaultFormat: DefaultFormatId,
  formats: readonly MediaFormat[],
): DraftOptions {
  const preset = DEFAULTS[defaultFormat];
  return {
    kind: preset.kind,
    container: 'mp4',
    qualityHeight: bestHeightAtMost(formats, preset.maxHeight),
    audioFormat: preset.audioFormat,
    audioQuality: preset.audioQuality,
    trim: null,
    subtitleLanguages: [],
    subtitleMode: 'embed',
    embedMetadata: true,
  };
}

export function isTrimmed(
  options: DraftOptions,
  duration: number | null,
): boolean {
  if (options.trim === null || duration === null) return false;
  return options.trim.start > 0 || options.trim.end < duration;
}

function videoFields(item: ReadyItem): Partial<DownloadRequest> {
  const { options, formats } = item;
  const format = formats.find(
    (candidate) => candidate.height === options.qualityHeight,
  );
  return {
    container: options.container,
    ...(format ? { format_id: format.id } : {}),
    ...(options.qualityHeight !== null
      ? { quality_height: options.qualityHeight }
      : {}),
    ...(options.subtitleLanguages.length > 0
      ? {
          subtitles: {
            languages: options.subtitleLanguages,
            mode: options.subtitleMode,
          },
        }
      : {}),
  };
}

export function toDownloadRequest(item: ReadyItem): DownloadRequest {
  const { options, media } = item;
  const kindFields =
    options.kind === 'video'
      ? videoFields(item)
      : {
          audio_format: options.audioFormat,
          audio_quality: options.audioQuality,
        };
  return {
    url: media.url,
    title: media.title,
    format: options.kind,
    ...kindFields,
    ...(isTrimmed(options, media.duration) && options.trim
      ? { trim: options.trim }
      : {}),
    embed_metadata: options.embedMetadata,
  };
}

function selectedSeconds(options: DraftOptions, duration: number): number {
  return options.trim
    ? Math.max(options.trim.end - options.trim.start, 0)
    : duration;
}

export function estimateBytes(
  options: DraftOptions,
  formats: readonly MediaFormat[],
  duration: number | null,
): number | null {
  if (duration === null || duration <= 0) return null;
  const seconds = selectedSeconds(options, duration);
  if (options.kind === 'audio') {
    const kbps = AUDIO_BITRATES_KBPS[options.audioFormat][options.audioQuality];
    return Math.round((kbps * BITS_PER_KILOBIT * seconds) / BITS_PER_BYTE);
  }
  const format = formats.find(
    (candidate) => candidate.height === options.qualityHeight,
  );
  return format?.filesize
    ? Math.round((format.filesize * seconds) / duration)
    : null;
}
