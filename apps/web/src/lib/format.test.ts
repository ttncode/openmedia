import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatClock,
  formatSpeed,
  parseClock,
  splitDuration,
} from './format';

describe('format', () => {
  it('formats sizes with locale decimal separators', () => {
    expect(formatBytes(1_600_000_000, 'vi')).toBe('1,6 GB');
    expect(formatBytes(412_000_000, 'en')).toBe('412 MB');
    expect(formatBytes(57_300_000, 'vi')).toBe('57,3 MB');
    expect(formatBytes(800, 'en')).toBe('0.1 MB');
  });

  it('formats speeds', () => {
    expect(formatSpeed(4_200_000, 'vi')).toBe('4,2 MB/s');
  });

  it('formats and parses clocks', () => {
    expect(formatClock(1122)).toBe('18:42');
    expect(formatClock(3735)).toBe('1:02:15');
    expect(parseClock('1:02:15')).toBe(3735);
    expect(parseClock('18:42')).toBe(1122);
    expect(parseClock('90')).toBe(90);
    expect(parseClock('1:xx')).toBeNull();
  });

  it('splits durations', () => {
    expect(splitDuration(3735)).toEqual({ hours: 1, minutes: 2, seconds: 15 });
  });
});
