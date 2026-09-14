import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  loadPersisted,
  saveHistory,
  saveItems,
  savePreferences,
} from './preferences';

describe('preferences', () => {
  it('returns defaults when nothing is stored or storage is corrupt', () => {
    expect(loadPersisted().preferences).toEqual(DEFAULT_PREFERENCES);
    window.localStorage.setItem('openmedia.preferences', '{broken');
    expect(loadPersisted().preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips preferences, ready items and history while dropping transient items', () => {
    savePreferences({ ...DEFAULT_PREFERENCES, accent: 'pink', theme: 'dark' });
    saveItems([
      { type: 'fetching', id: 'f', url: 'https://a.b' },
      {
        type: 'ready',
        id: 'r',
        media: {
          url: 'https://a.b',
          title: 'A',
          thumbnail: '',
          duration: 10,
          uploader: '',
          platform: 'other',
        },
        formats: [],
        options: {
          kind: 'video',
          container: 'mp4',
          qualityHeight: null,
          audioFormat: 'm4a',
          audioQuality: 'best',
          trim: null,
          subtitleLanguages: [],
          subtitleMode: 'embed',
          embedMetadata: true,
        },
      },
    ]);
    saveHistory([
      {
        id: 'h',
        url: 'https://a.b',
        title: 'A',
        kind: 'audio',
        label: 'MP3',
        sizeBytes: 1,
        finishedAt: '2026-09-14T00:00:00Z',
      },
    ]);
    const restored = loadPersisted();
    expect(restored.preferences.accent).toBe('pink');
    expect(restored.items.map((item) => item.id)).toEqual(['r']);
    expect(restored.history).toHaveLength(1);
  });

  it('falls back to empty lists when the queue or history holds non-array JSON', () => {
    window.localStorage.setItem('openmedia.queue', '{}');
    window.localStorage.setItem('openmedia.history', '{}');
    const restored = loadPersisted();
    expect(restored.items).toEqual([]);
    expect(restored.history).toEqual([]);
  });

  it('replaces stored preferences outside the allowed values with defaults', () => {
    window.localStorage.setItem(
      'openmedia.preferences',
      JSON.stringify({
        theme: 'neon',
        accent: 'pink',
        language: 'fr',
        defaultFormat: 'video-webm-4k',
        installHintDismissed: 'yes',
      }),
    );
    expect(loadPersisted().preferences).toEqual({
      ...DEFAULT_PREFERENCES,
      accent: 'pink',
    });
    window.localStorage.setItem('openmedia.preferences', 'null');
    expect(loadPersisted().preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('drops malformed queue and history entries', () => {
    window.localStorage.setItem(
      'openmedia.queue',
      JSON.stringify([null, 3, {}, { id: 'x' }]),
    );
    window.localStorage.setItem(
      'openmedia.history',
      JSON.stringify([null, 'h', { title: 'no id' }]),
    );
    const restored = loadPersisted();
    expect(restored.items).toEqual([]);
    expect(restored.history).toEqual([]);
  });
});
