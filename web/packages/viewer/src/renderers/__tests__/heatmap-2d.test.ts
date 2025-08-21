import * as THREE from 'three';
import { describe, it, expect, vi } from 'vitest';

import { textureSizeFromRingBuffer, generateGridLineVertices } from '../heatmap-2d';
import { SpectroRingBuffer } from '../../core/ring-buffer';

// Mock WASM bindings to avoid requiring compiled artifacts during tests
vi.mock('@spectro/wasm-bindings', () => ({}));

/**
 * Helper to create a ring buffer of the specified dimensions.
 * What: Instantiates SpectroRingBuffer with a dummy WebGL context.
 * Why: Allows CPU-side testing without actual WebGL.
 */
  function makeRingBuffer(binCount: number, maxRows: number): SpectroRingBuffer {
    class FakeWebGL2Context {
      getExtension(_name: string): unknown {
        return {};
      }
    }
    (globalThis as any).WebGL2RenderingContext = FakeWebGL2Context;
    const gl = new FakeWebGL2Context() as unknown as WebGL2RenderingContext;
    return new SpectroRingBuffer(gl, { binCount, maxRows, format: 'R32F', linearFilter: false });
  }

describe('textureSizeFromRingBuffer', () => {
  it('writes buffer stats into the provided vector', () => {
    const cases = [
      { bins: 16, rows: 8 },
      { bins: 32, rows: 16 }
    ];

    for (const { bins, rows } of cases) {
      const rb = makeRingBuffer(bins, rows);
      const target = new THREE.Vector2();
      const result = textureSizeFromRingBuffer(rb, target);
      expect(result).toBe(target);
      expect(target.x).toBe(bins);
      expect(target.y).toBe(rows);
    }
  });

  it('throws on invalid statistics', () => {
    const badRing = { getStats: () => ({ binCount: 0, maxRows: 0 }) } as SpectroRingBuffer;
    expect(() => textureSizeFromRingBuffer(badRing)).toThrow();
  });
});

/**
 * Tests for {@link generateGridLineVertices}.
 * What: Ensures geometry generation validates bounds and counts.
 * Why: Guarantees fail-fast behavior on invalid parameters.
 */
describe('generateGridLineVertices', () => {
  /** Line count used for test grids. */
  const TEST_LINE_COUNT = 3;
  /** Lower bound for valid grid generation. */
  const TEST_MIN = 0;
  /** Upper bound for valid grid generation. */
  const TEST_MAX = 1;

  it('throws when max is not greater than min', () => {
    expect(() => generateGridLineVertices(TEST_LINE_COUNT, TEST_MAX, TEST_MAX)).toThrow();
    expect(() => generateGridLineVertices(TEST_LINE_COUNT, TEST_MAX, TEST_MIN)).toThrow();
  });

  it('generates expected line count for valid bounds', () => {
    const { horizontal, vertical } = generateGridLineVertices(
      TEST_LINE_COUNT,
      TEST_MIN,
      TEST_MAX
    );
    expect(horizontal).toHaveLength(TEST_LINE_COUNT);
    expect(vertical).toHaveLength(TEST_LINE_COUNT);
  });
});
