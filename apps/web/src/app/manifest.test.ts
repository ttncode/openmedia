import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('manifest', () => {
  it('declares an installable app with a share target', () => {
    const value = manifest();
    expect(value.name).toBe('OpenMedia');
    expect(value.display).toBe('standalone');
    expect(value.theme_color).toBe('#12939c');
    expect(value.icons?.map((icon) => icon.sizes)).toEqual([
      'any',
      '192x192',
      '512x512',
      '512x512',
    ]);
    expect(value.share_target).toEqual({
      action: '/',
      method: 'GET',
      params: { url: 'url', text: 'text', title: 'title' },
    });
  });
});
