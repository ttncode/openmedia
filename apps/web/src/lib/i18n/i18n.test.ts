import { describe, expect, it } from 'vitest';
import { en } from './en';
import { resolveLocale } from './I18nProvider';
import { vi as vietnamese } from './vi';

function keysOf(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keysOf(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('i18n', () => {
  it('resolves the browser language', () => {
    expect(resolveLocale('auto', 'vi-VN')).toBe('vi');
    expect(resolveLocale('auto', 'en-US')).toBe('en');
    expect(resolveLocale('auto', 'fr-FR')).toBe('en');
    expect(resolveLocale('vi', 'en-US')).toBe('vi');
  });

  it('keeps both dictionaries in sync', () => {
    expect(keysOf(vietnamese).sort()).toEqual(keysOf(en).sort());
  });

  it('uses singular English nouns for a count of one', () => {
    expect(en.queue.summary(1, 0, 1)).toBe('1 item, 0 downloading, 1 done');
    expect(en.queue.summary(2, 1, 0)).toBe('2 items, 1 downloading, 0 done');
    expect(en.settings.cookiesLoaded('youtube.com', 1)).toBe(
      'Loaded for youtube.com, expires in 1 day',
    );
    expect(en.island.playlistAdded(1)).toBe('Added 1 video from the playlist');
  });

  it('contains no dash characters reserved by the style guide', () => {
    const strings = JSON.stringify([en, vietnamese]);
    expect(strings).not.toMatch(/[–—]/);
  });
});
