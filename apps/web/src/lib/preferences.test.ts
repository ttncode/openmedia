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
});
