import * as THREE from 'three';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Heatmap2D, textureSizeFromRingBuffer } from '../heatmap-2d';
import { SpectroRingBuffer } from '../../core/ring-buffer';

// Mock WASM bindings to avoid requiring compiled artifacts during tests
vi.mock('@spectro/wasm-bindings', () => ({}), { virtual: true });
// Stub react-three-fiber hooks used by Heatmap2D to prevent frame scheduling
vi.mock('@react-three/fiber', () => ({ useFrame: () => {} }));

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
 * Minimal stub implementation of {@link SpectroRingBuffer} for component tests.
 * What: Provides adjustable statistics without WebGL dependencies.
 * Why: Allows verification of stat caching logic in {@link Heatmap2D}.
 */
class StubRingBuffer {
  /** Current number of frequency bins. */
  private binCount: number;
  /** Current maximum row capacity. */
  private maxRows: number;
  /** How many times {@link getStats} has been invoked. */
  public getStatsCalls = 0;
  /** Last statistics snapshot returned. */
  public lastStats = { binCount: 0, maxRows: 0, rowCount: 0, writeRow: 0 };

  constructor(binCount: number, maxRows: number) {
    this.binCount = binCount;
    this.maxRows = maxRows;
  }

  /** Update internal dimensions to simulate a resize. */
  resize(binCount: number, maxRows: number): void {
    this.binCount = binCount;
    this.maxRows = maxRows;
  }

  /**
   * Report current statistics and track invocation count.
   * @returns Object mirroring {@link SpectroRingBuffer.getStats}.
   */
  getStats() {
    this.getStatsCalls++;
    this.lastStats = {
      binCount: this.binCount,
      maxRows: this.maxRows,
      rowCount: 0,
      writeRow: 0
    };
    return this.lastStats;
  }

  /** Provide a dummy texture; unused but satisfies interface. */
  getTexture() {
    const data = new Uint8Array(1);
    return new THREE.DataTexture(data, 1, 1);
  }
}

describe('Heatmap2D', () => {
  /** Baseline dB floor for normalization. */
  const DB_FLOOR = 0;
  /** Baseline dB ceiling for normalization. */
  const DB_CEILING = 1;
  /** Initial number of bins for stub buffer. */
  const INITIAL_BINS = 4;
  /** Initial max rows for stub buffer. */
  const INITIAL_ROWS = 4;
  /** Bin count after simulated resize. */
  const RESIZED_BINS = 8;
  /** Row count after simulated resize. */
  const RESIZED_ROWS = 6;

  it('caches stats and refreshes them when the ring buffer resizes', () => {
    const rb = new StubRingBuffer(INITIAL_BINS, INITIAL_ROWS);
    const { rerender } = render(
      <Heatmap2D
        ringBuffer={rb as unknown as SpectroRingBuffer}
        palette="viridis"
        dbFloor={DB_FLOOR}
        dbCeiling={DB_CEILING}
        showGrid
      />
    );

    const initialCalls = rb.getStatsCalls;
    expect(initialCalls % 2).toBe(0); // two getStats invocations per render
    expect(rb.lastStats.binCount).toBe(INITIAL_BINS);
    expect(rb.lastStats.maxRows).toBe(INITIAL_ROWS);

    rb.resize(RESIZED_BINS, RESIZED_ROWS);
    rerender(
      <Heatmap2D
        ringBuffer={rb as unknown as SpectroRingBuffer}
        palette="viridis"
        dbFloor={DB_FLOOR}
        dbCeiling={DB_CEILING}
        showGrid
      />
    );

    expect(rb.getStatsCalls - initialCalls).toBe(2); // refresh stats after resize
    expect(rb.lastStats.binCount).toBe(RESIZED_BINS);
    expect(rb.lastStats.maxRows).toBe(RESIZED_ROWS);
  });
});

