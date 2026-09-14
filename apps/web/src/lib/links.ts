export type PlatformId =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'soundcloud'
  | 'x'
  | 'facebook'
  | 'vimeo'
  | 'other';

const PLATFORM_HOSTS: ReadonlyArray<readonly [PlatformId, RegExp]> = [
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['tiktok', /(^|\.)tiktok\.com$/],
  ['instagram', /(^|\.)instagram\.com$/],
  ['soundcloud', /(^|\.)soundcloud\.com$/],
  ['x', /(^|\.)(x\.com|twitter\.com)$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.watch)$/],
  ['vimeo', /(^|\.)vimeo\.com$/],
];

const LINK_PATTERN = /^https?:\/\/[^\s/$.?#].\S*$/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function parseLinks(text: string): string[] {
  const tokens = text
    .split(/[\s,]+/)
    .filter((token) => LINK_PATTERN.test(token));
  return [...new Set(tokens)];
}

export function detectPlatform(url: string): PlatformId {
  const host = hostOf(url);
  return (
    PLATFORM_HOSTS.find(([, pattern]) => pattern.test(host))?.[0] ?? 'other'
  );
}

export function detectPlatforms(urls: readonly string[]): PlatformId[] {
  return [...new Set(urls.map(detectPlatform))];
}

export function hasPlaylist(url: string): boolean {
  try {
    return new URL(url).searchParams.has('list');
  } catch {
    return false;
  }
}

export function linkFromShare({
  url,
  text,
}: {
  url: string | null;
  text: string | null;
}): string | null {
  return parseLinks([url ?? '', text ?? ''].join(' '))[0] ?? null;
}
