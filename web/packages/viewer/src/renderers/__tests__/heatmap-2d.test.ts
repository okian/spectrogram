import * as THREE from 'three';
import { describe, it, expect, vi } from 'vitest';

import { textureSizeFromRingBuffer } from '../heatmap-2d';
import { SpectroRingBuffer } from '../../core/ring-buffer';

// Mock WASM bindings to avoid requiring compiled artifacts during tests
vi.mock('@spectro/wasm-bindings', () => ({}), { virtual: true });

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
