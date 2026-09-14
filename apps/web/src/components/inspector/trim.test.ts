import { describe, expect, it } from 'vitest';
import {
  fullRange,
  nearestEdge,
  nudgeEdge,
  secondsAtPointer,
  setEdge,
} from './trim';

describe('trim math', () => {
  it('keeps at least one second between edges and stays inside the duration', () => {
    const range = fullRange(100);
    expect(setEdge(range, 'start', 150, 100)).toEqual({ start: 99, end: 100 });
    expect(setEdge({ start: 40, end: 60 }, 'end', 10, 100)).toEqual({
      start: 40,
      end: 41,
    });
    expect(setEdge(range, 'start', -5, 100)).toEqual({ start: 0, end: 100 });
  });

  it('nudges with arrows, shift and home or end', () => {
    const range = { start: 10, end: 50 };
    expect(nudgeEdge(range, 'start', 'ArrowRight', false, 100)).toEqual({
      start: 11,
      end: 50,
    });
    expect(nudgeEdge(range, 'end', 'ArrowLeft', true, 100)).toEqual({
      start: 10,
      end: 40,
    });
    expect(nudgeEdge(range, 'end', 'End', false, 100)).toEqual({
      start: 10,
      end: 100,
    });
    expect(nudgeEdge(range, 'start', 'Home', false, 100)).toEqual({
      start: 0,
      end: 50,
    });
    expect(nudgeEdge(range, 'start', 'Enter', false, 100)).toBeNull();
  });

  it('maps pointer positions and picks the nearest handle', () => {
    expect(secondsAtPointer(150, { left: 100, width: 200 }, 60)).toBe(15);
    expect(secondsAtPointer(50, { left: 100, width: 200 }, 60)).toBe(0);
    expect(nearestEdge({ start: 10, end: 50 }, 20)).toBe('start');
    expect(nearestEdge({ start: 10, end: 50 }, 40)).toBe('end');
  });
});
