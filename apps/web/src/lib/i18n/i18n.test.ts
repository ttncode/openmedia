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

  it('contains no dash characters reserved by the style guide', () => {
    const strings = JSON.stringify([en, vietnamese]);
    expect(strings).not.toMatch(/[–—]/);
  });
});
