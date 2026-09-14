import { jobLabel } from '@/state/reducer';
import type { QueueItem } from '@/state/types';
import {
  formatBytes,
  formatClock,
  formatSpeed,
  splitDuration,
  type Locale,
} from './format';
import type { Messages } from './i18n/en';

const MILLISECONDS_PER_MINUTE = 60_000;
const ACTIVE_DOWNLOAD_STATUSES = new Set(['downloading']);

export function remainingText(seconds: number | null, t: Messages): string {
  if (seconds === null) return '';
  const { hours, minutes, seconds: rest } = splitDuration(Math.max(1, seconds));
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes === 0
    ? t.time.secondsLeft(rest)
    : t.time.minutesLeft(totalMinutes, rest);
}

export function expiryText(
  expiresAt: string | null,
  t: Messages,
  now: Date,
): string {
  if (expiresAt === null) return '';
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(expiresAt).getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE,
    ),
  );
  return t.time.expiresIn(minutes);
}

function errorText(code: string, t: Messages): string {
  const errors: Record<string, string> = t.errors;
  return errors[code] ?? t.errors.unknown_error;
}

export function rowLine(
  item: QueueItem,
  t: Messages,
  locale: Locale,
): { text: string; tone: 'normal' | 'error' } {
  if (item.type === 'fetching')
    return { text: t.queue.fetching, tone: 'normal' };
  if (item.type === 'fetch-error')
    return { text: errorText(item.code, t), tone: 'error' };
  if (item.type === 'ready') {
    const duration =
      item.media.duration === null
        ? ''
        : `, ${formatClock(item.media.duration)}`;
    return {
      text: `${item.media.uploader || item.media.url}${duration}`,
      tone: 'normal',
    };
  }
  const { job } = item;
  if (job.status === 'error')
    return {
      text: errorText(job.error_code ?? 'unknown_error', t),
      tone: 'error',
    };
  if (job.status === 'queued')
    return { text: t.queue.queued(job.queue_position), tone: 'normal' };
  if (job.status === 'processing')
    return { text: t.queue.processing, tone: 'normal' };
  if (job.status === 'done') {
    const size = formatBytes(job.files[0]?.size_bytes ?? 0, locale);
    return {
      text: t.queue.doneLine(
        jobLabel(job),
        size,
        expiryText(job.expires_at, t, new Date()),
      ),
      tone: 'normal',
    };
  }
  if (ACTIVE_DOWNLOAD_STATUSES.has(job.status)) {
    const speed =
      job.speed_bps === null ? '' : formatSpeed(job.speed_bps, locale);
    return {
      text: t.queue.downloadingLine(
        Math.floor(job.progress),
        speed,
        remainingText(job.eta_seconds, t),
      ),
      tone: 'normal',
    };
  }
  return { text: t.queue.cancelled, tone: 'normal' };
}
