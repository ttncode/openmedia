import type { TrimRange } from '@/lib/api/types';

export const MIN_TRIM_SECONDS = 1;
export const STEP_SECONDS = 1;
export const BIG_STEP_SECONDS = 10;

export type TrimEdge = 'start' | 'end';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

export function fullRange(duration: number): TrimRange {
  return { start: 0, end: duration };
}

export function setEdge(
  range: TrimRange,
  edge: TrimEdge,
  seconds: number,
  duration: number,
): TrimRange {
  const rounded = Math.round(seconds);
  return edge === 'start'
    ? { start: clamp(rounded, 0, range.end - MIN_TRIM_SECONDS), end: range.end }
    : {
        start: range.start,
        end: clamp(rounded, range.start + MIN_TRIM_SECONDS, duration),
      };
}

const KEY_DIRECTIONS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
};

export function nudgeEdge(
  range: TrimRange,
  edge: TrimEdge,
  key: string,
  shiftKey: boolean,
  duration: number,
): TrimRange | null {
  if (key === 'Home') return setEdge(range, edge, 0, duration);
  if (key === 'End') return setEdge(range, edge, duration, duration);
  const direction = KEY_DIRECTIONS[key];
  if (direction === undefined) return null;
  const current = edge === 'start' ? range.start : range.end;
  return setEdge(
    range,
    edge,
    current + direction * (shiftKey ? BIG_STEP_SECONDS : STEP_SECONDS),
    duration,
  );
}

export function secondsAtPointer(
  clientX: number,
  bounds: { left: number; width: number },
  duration: number,
): number {
  const ratio = clamp((clientX - bounds.left) / bounds.width, 0, 1);
  return ratio * duration;
}

export function nearestEdge(range: TrimRange, seconds: number): TrimEdge {
  return Math.abs(seconds - range.start) <= Math.abs(seconds - range.end)
    ? 'start'
    : 'end';
}
