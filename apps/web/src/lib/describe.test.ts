import { describe, expect, it } from 'vitest';
import type { Job } from './api/types';
import { en } from './i18n/en';
import { vi } from './i18n/vi';
import { expiryText, remainingText, rowLine } from './describe';

const base: Job = {
  job_id: 'j',
  url: 'https://youtu.be/a',
  title: 'Pho',
  status: 'downloading',
  progress: 63.4,
  speed_bps: 4_200_000,
  eta_seconds: 90,
  downloaded_bytes: 1,
  total_bytes: 2,
  queue_position: 0,
  options: {
    kind: 'video',
    container: 'mp4',
    quality_height: 1080,
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
  created_at: '2026-09-14T08:00:00Z',
  finished_at: null,
  expires_at: null,
};

const media = {
  url: base.url,
  title: 'Pho',
  thumbnail: '',
  duration: 1122,
  uploader: 'Bep',
  platform: 'youtube' as const,
};
const options = {
  kind: 'video' as const,
  container: 'mp4' as const,
  qualityHeight: 1080,
  audioFormat: 'm4a' as const,
  audioQuality: 'best' as const,
  trim: null,
  subtitleLanguages: [],
  subtitleMode: 'embed' as const,
  embedMetadata: true,
};

describe('describe', () => {
  it('formats remaining time', () => {
    expect(remainingText(7, en)).toBe('7 s left');
    expect(remainingText(90, en)).toBe('1 min 30 s left');
    expect(remainingText(null, en)).toBe('');
  });

  it('formats expiry relative to now', () => {
    expect(
      expiryText('2026-09-14T09:00:00Z', en, new Date('2026-09-14T08:08:00Z')),
    ).toBe('Deleted in 52 min');
    expect(expiryText(null, en, new Date())).toBe('');
  });

  it('describes rows for each state', () => {
    const job = {
      type: 'job' as const,
      id: 'j',
      media,
      formats: [],
      options,
      linkedAt: 0,
    };
    expect(rowLine({ ...job, job: base }, en, 'en').text).toBe(
      '63% · 4.2 MB/s, 1 min 30 s left',
    );
    expect(
      rowLine(
        { ...job, job: { ...base, status: 'queued', queue_position: 2 } },
        en,
        'en',
      ).text,
    ).toBe('Waiting, position 2');
    expect(
      rowLine(
        { ...job, job: { ...base, status: 'error', error_code: 'bot_check' } },
        en,
        'en',
      ),
    ).toEqual({ text: en.errors.bot_check, tone: 'error' });
    expect(
      rowLine({ type: 'ready', id: 'r', media, formats: [], options }, en, 'en')
        .text,
    ).toBe('Bep, 18:42');
    expect(
      rowLine(
        {
          type: 'fetch-error',
          id: 'e',
          url: 'https://x.y',
          code: 'unsupported_url',
        },
        en,
        'en',
      ).tone,
    ).toBe('error');
  });

  it('leaves out speed and time left until the download reports them', () => {
    const job = {
      type: 'job' as const,
      id: 'j',
      media,
      formats: [],
      options,
      linkedAt: 0,
    };
    const starting = {
      ...base,
      progress: 0,
      speed_bps: null,
      eta_seconds: null,
    };
    expect(rowLine({ ...job, job: starting }, en, 'en').text).toBe('0%');
    expect(rowLine({ ...job, job: starting }, vi, 'vi').text).toBe('0%');
    expect(
      rowLine({ ...job, job: { ...starting, speed_bps: 4_200_000 } }, en, 'en')
        .text,
    ).toBe('0% · 4.2 MB/s');
  });
});
