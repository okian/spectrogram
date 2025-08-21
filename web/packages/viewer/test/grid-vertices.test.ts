import { describe, it, expect } from 'vitest';
import {
  generateGridLineVertices,
  getGridLineVertices,
  textureSizeFromRingBuffer
} from '../src/renderers/heatmap-2d';

/** Number of lines in the test grid, matching production default. */
const TEST_LINE_COUNT = 10;
/** Minimum coordinate for test grid geometry. */
const TEST_MIN = -1;
/** Maximum coordinate for test grid geometry. */
const TEST_MAX = 1;

describe('grid line vertex memoization', () => {
  it('reuses arrays across calls', () => {
    const first = getGridLineVertices();
    const second = getGridLineVertices();
    expect(second.horizontal[0]).toBe(first.horizontal[0]);
    expect(second.vertical[0]).toBe(first.vertical[0]);
  });

  it('matches expected grid geometry values', () => {
    const memoized = getGridLineVertices();
    const generated = generateGridLineVertices(TEST_LINE_COUNT, TEST_MIN, TEST_MAX);
    expect(Array.from(memoized.horizontal[0])).toEqual(Array.from(generated.horizontal[0]));
    expect(Array.from(memoized.vertical[0])).toEqual(Array.from(generated.vertical[0]));
  });

  it('throws on invalid grid line count', () => {
    expect(() => generateGridLineVertices(1, TEST_MIN, TEST_MAX)).toThrow();
  });
});

describe('textureSizeFromRingBuffer', () => {
  it('derives dimensions from valid stats', () => {
    const ringBuffer = { getStats: () => ({ binCount: 2, maxRows: 4 }) } as const;
    const size = textureSizeFromRingBuffer(ringBuffer as any);
    expect(size.x).toBe(2);
    expect(size.y).toBe(4);
  });

  it('throws on non-positive stats', () => {
    const ringBuffer = { getStats: () => ({ binCount: 0, maxRows: -1 }) } as const;
    expect(() => textureSizeFromRingBuffer(ringBuffer as any)).toThrow();
  });
});
