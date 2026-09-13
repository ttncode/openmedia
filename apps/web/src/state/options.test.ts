import { describe, expect, it } from 'vitest';
import type { MediaFormat } from '@/lib/api/types';
import {
  defaultDraft,
  estimateBytes,
  isTrimmed,
  toDownloadRequest,
} from './options';
import type { ReadyItem } from './types';

const FORMATS: MediaFormat[] = [
  {
    id: '313',
    label: '2160p',
    height: 2160,
    ext: 'webm',
    filesize: 1_600_000_000,
  },
  {
    id: '137',
    label: '1080p',
    height: 1080,
    ext: 'mp4',
    filesize: 412_000_000,
  },
  { id: '136', label: '720p', height: 720, ext: 'mp4', filesize: null },
];

function readyItem(overrides: Partial<ReadyItem['options']> = {}): ReadyItem {
  return {
    type: 'ready',
    id: 'r1',
    media: {
      url: 'https://youtu.be/a',
      title: 'Pho',
      thumbnail: '',
      duration: 1122,
      uploader: 'Bep',
      platform: 'youtube',
    },
    formats: FORMATS,
    options: { ...defaultDraft('video-mp4-1080', FORMATS), ...overrides },
  };
}

describe('options', () => {
  it('picks the best height at or below the default', () => {
    expect(defaultDraft('video-mp4-1080', FORMATS).qualityHeight).toBe(1080);
    expect(defaultDraft('video-mp4-720', FORMATS).qualityHeight).toBe(720);
    expect(defaultDraft('video-mp4-1080', []).qualityHeight).toBeNull();
    expect(defaultDraft('audio-mp3', FORMATS)).toMatchObject({
      kind: 'audio',
      audioFormat: 'mp3',
      audioQuality: '320k',
    });
  });

  it('builds a minimal video request', () => {
    expect(toDownloadRequest(readyItem())).toEqual({
      url: 'https://youtu.be/a',
      title: 'Pho',
      format: 'video',
      container: 'mp4',
      format_id: '137',
      quality_height: 1080,
      embed_metadata: true,
    });
  });

  it('includes trim and subtitles only when used', () => {
    const request = toDownloadRequest(
      readyItem({
        trim: { start: 5, end: 65 },
        subtitleLanguages: ['vi'],
        subtitleMode: 'srt',
      }),
    );
    expect(request.trim).toEqual({ start: 5, end: 65 });
    expect(request.subtitles).toEqual({ languages: ['vi'], mode: 'srt' });
    expect(
      toDownloadRequest(readyItem({ trim: { start: 0, end: 1122 } })).trim,
    ).toBeUndefined();
  });

  it('builds an audio request', () => {
    expect(
      toDownloadRequest(
        readyItem({ kind: 'audio', audioFormat: 'flac', audioQuality: 'best' }),
      ),
    ).toEqual({
      url: 'https://youtu.be/a',
      title: 'Pho',
      format: 'audio',
      audio_format: 'flac',
      audio_quality: 'best',
      embed_metadata: true,
    });
  });

  it('estimates sizes from formats, trim and bitrates', () => {
    const item = readyItem();
    expect(estimateBytes(item.options, FORMATS, 1122)).toBe(412_000_000);
    expect(
      estimateBytes(
        { ...item.options, trim: { start: 0, end: 561 } },
        FORMATS,
        1122,
      ),
    ).toBe(206_000_000);
    expect(
      estimateBytes(
        {
          ...item.options,
          kind: 'audio',
          audioFormat: 'mp3',
          audioQuality: '320k',
        },
        FORMATS,
        60,
      ),
    ).toBe(2_400_000);
    expect(
      estimateBytes({ ...item.options, qualityHeight: 720 }, FORMATS, null),
    ).toBeNull();
  });

  it('knows when a range is trimmed', () => {
    expect(
      isTrimmed(
        { ...readyItem().options, trim: { start: 0, end: 1122 } },
        1122,
      ),
    ).toBe(false);
    expect(
      isTrimmed(
        { ...readyItem().options, trim: { start: 3, end: 1122 } },
        1122,
      ),
    ).toBe(true);
  });
});
