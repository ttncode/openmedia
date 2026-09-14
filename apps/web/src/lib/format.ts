export type Locale = 'vi' | 'en';

const BYTES_PER_MEGABYTE = 1_000_000;
const MEGABYTES_PER_GIGABYTE = 1000;
const MINIMUM_MEGABYTES = 0.1;
const LOCALE_TAGS: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };

function decimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatBytes(bytes: number, locale: Locale): string {
  const megabytes = Math.max(bytes / BYTES_PER_MEGABYTE, MINIMUM_MEGABYTES);
  return megabytes >= MEGABYTES_PER_GIGABYTE
    ? `${decimal(megabytes / MEGABYTES_PER_GIGABYTE, locale)} GB`
    : `${decimal(megabytes, locale)} MB`;
}

export function formatSpeed(bytesPerSecond: number, locale: Locale): string {
  return `${formatBytes(bytesPerSecond, locale)}/s`;
}

export function splitDuration(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const whole = Math.max(0, Math.round(totalSeconds));
  return {
    hours: Math.floor(whole / 3600),
    minutes: Math.floor((whole % 3600) / 60),
    seconds: whole % 60,
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

export function formatClock(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSeconds);
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

export function parseClock(text: string): number | null {
  const parts = text.trim().split(':');
  const valid =
    parts.length >= 1 &&
    parts.length <= 3 &&
    parts.every((part) => /^\d+$/.test(part));
  return valid
    ? parts.reduce((total, part) => total * 60 + Number(part), 0)
    : null;
}
