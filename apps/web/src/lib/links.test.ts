import { describe, expect, it } from 'vitest';
import {
  detectPlatform,
  detectPlatforms,
  hasPlaylist,
  linkFromShare,
  parseLinks,
} from './links';

describe('links', () => {
  it('parses links separated by spaces, commas and newlines without duplicates', () => {
    const text =
      'https://youtu.be/a, https://www.tiktok.com/@x/video/1\nhttps://youtu.be/a not-a-link ftp://x.y';
    expect(parseLinks(text)).toEqual([
      'https://youtu.be/a',
      'https://www.tiktok.com/@x/video/1',
    ]);
  });

  it('detects platforms by host', () => {
    expect(detectPlatform('https://m.youtube.com/watch?v=1')).toBe('youtube');
    expect(detectPlatform('https://x.com/a/status/1')).toBe('x');
    expect(detectPlatform('https://soundcloud.com/a/b')).toBe('soundcloud');
    expect(detectPlatform('https://example.org/v')).toBe('other');
    expect(
      detectPlatforms([
        'https://youtu.be/a',
        'https://youtube.com/b',
        'https://vimeo.com/1',
      ]),
    ).toEqual(['youtube', 'vimeo']);
  });

  it('recognizes playlist parameters', () => {
    expect(hasPlaylist('https://www.youtube.com/watch?v=a&list=PL1')).toBe(
      true,
    );
    expect(hasPlaylist('https://www.youtube.com/watch?v=a')).toBe(false);
  });

  it('extracts a link from share target parameters', () => {
    expect(
      linkFromShare({ url: null, text: 'Look https://youtu.be/a nice' }),
    ).toBe('https://youtu.be/a');
    expect(linkFromShare({ url: 'https://vimeo.com/1', text: null })).toBe(
      'https://vimeo.com/1',
    );
    expect(linkFromShare({ url: null, text: 'no link' })).toBeNull();
  });
});
