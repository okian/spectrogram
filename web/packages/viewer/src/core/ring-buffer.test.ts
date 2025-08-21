import { test, expect } from 'vitest';
import * as THREE from 'three';
import { SpectroRingBuffer, RingBufferConfig } from './ring-buffer';

/** Fake WebGL2 context providing float texture support by default. */
class FakeWebGL2Context {
  /** Numeric constant for texture target. */
  TEXTURE_2D = 0;
  /** Numeric constant for red channel format. */
  RED = 0;
  /** No-op bindTexture to satisfy interface. */
  bindTexture(): void {}
  /** No-op texSubImage2D to satisfy interface. */
  texSubImage2D(): void {}
  /** Report presence of any requested extension. */
  getExtension(_name: string): unknown {
    return {};
  }
}
// Expose the fake class globally so `instanceof WebGL2RenderingContext` works.
(globalThis as any).WebGL2RenderingContext = FakeWebGL2Context;
/** Shared instance representing a WebGL2 environment. */
const GL_WEBGL2 = new FakeWebGL2Context() as unknown as WebGL2RenderingContext;

/** Generic WebGL1 context with configurable extension support. */
class FakeWebGL1Context {
  constructor(private readonly extensions: Record<string, boolean>) {}
  /** Numeric constant for texture target. */
  TEXTURE_2D = 0;
  /** Numeric constant for red channel format. */
  RED = 0;
  /** No-op bindTexture to satisfy interface. */
  bindTexture(): void {}
  /** No-op texSubImage2D to satisfy interface. */
  texSubImage2D(): void {}
  /** Return extension object when available. */
  getExtension(name: string): unknown {
    return this.extensions[name] ? {} : null;
  }
}
/** WebGL1 context exposing all float texture extensions. */
const GL_WEBGL1_WITH_EXT = new FakeWebGL1Context({
  OES_texture_float: true,
  OES_texture_float_linear: true,
  OES_texture_half_float: true,
  OES_texture_half_float_linear: true
}) as unknown as WebGLRenderingContext;
/** WebGL1 context without float texture support. */
const GL_WEBGL1_NO_EXT = new FakeWebGL1Context({}) as unknown as WebGLRenderingContext;
/** WebGL1 context missing linear filtering extension. */
const GL_WEBGL1_NO_LINEAR = new FakeWebGL1Context({
  OES_texture_float: true
}) as unknown as WebGLRenderingContext;

/** Standard bin count used across tests. */
const BIN_COUNT = 3;
/** Standard row capacity for buffers under test. */
const MAX_ROWS = 4;

/**
 * Verify R32F data is stored and typed correctly with WebGL2.
 */
test('stores R32F rows without modification', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R32F',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL2, config);
  const row = new Float32Array([1, 0.5, 0]);
  buffer.pushRow(row);
  expect(buffer.getStats().rowCount).toBe(1);
  const stored = new Float32Array(buffer.getTexture().image.data.slice(0, BIN_COUNT));
  expect(stored).toEqual(row);
  expect(buffer.getTexture().type).toBe(THREE.FloatType);
});

/**
 * Verify R16F configuration on WebGL1 with extensions.
 */
test('accepts R16F configuration with float rows', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R16F',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL1_WITH_EXT, config);
  const row = new Float32Array([0, 0.25, 0.5]);
  buffer.pushRow(row);
  const stored = new Float32Array(buffer.getTexture().image.data.slice(0, BIN_COUNT));
  expect(stored).toEqual(row);
  expect(buffer.getTexture().type).toBe(THREE.HalfFloatType);
});

/**
 * Verify UNORM8 data handling on WebGL1 without extensions.
 */
test('stores UNORM8 byte rows', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'UNORM8',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL1_NO_EXT, config);
  const row = new Uint8Array([0, 128, 255]);
  buffer.pushRow(row);
  const stored = new Uint8Array(buffer.getTexture().image.data.slice(0, BIN_COUNT));
  expect(stored).toEqual(row);
  expect(buffer.getTexture().type).toBe(THREE.UnsignedByteType);
});

/**
 * Ensure mismatched bin counts throw clear errors.
 */
test('throws for incorrect bin length', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R32F',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL2, config);
  expect(() => buffer.pushRow(new Float32Array([0, 1]))).toThrow(/Expected 3 bins/);
});

/**
 * Ensure float textures error on WebGL1 without extensions.
 */
test('throws when float textures unsupported in WebGL1', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R32F',
    linearFilter: false
  };
  expect(() => new SpectroRingBuffer(GL_WEBGL1_NO_EXT, config)).toThrow(/OES_texture_float/);
});

/**
 * Ensure linear filtering requires appropriate extension.
 */
test('throws when linear filtering extension missing', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R32F',
    linearFilter: true
  };
  expect(() => new SpectroRingBuffer(GL_WEBGL1_NO_LINEAR, config)).toThrow(/linear filtering/i);
});

/**
 * Ensure sequential row insertion stores data correctly.
 */
test('pushRow inserts rows sequentially', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'UNORM8',
    linearFilter: false,
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL1_NO_EXT, config);
  buffer.pushRow(new Uint8Array([1, 2, 3]));
  buffer.pushRow(new Uint8Array([4, 5, 6]));
  expect(buffer.getStats().rowCount).toBe(2);
  const data = new Uint8Array(buffer.getTexture().image.data);
  expect(Array.from(data.slice(0, BIN_COUNT))).toEqual([1, 2, 3]);
  expect(Array.from(data.slice(BIN_COUNT, BIN_COUNT * 2))).toEqual([4, 5, 6]);
});

/**
 * Verify old rows are overwritten when capacity wraps around.
 */
test('pushRow wraps around after reaching capacity', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: 2,
    format: 'UNORM8',
    linearFilter: false,
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL1_NO_EXT, config);
  const a = new Uint8Array([1, 1, 1]);
  const b = new Uint8Array([2, 2, 2]);
  const c = new Uint8Array([3, 3, 3]);
  buffer.pushRow(a);
  buffer.pushRow(b);
  buffer.pushRow(c); // overwrites first row
  const stats = buffer.getStats();
  expect(stats.rowCount).toBe(2);
  expect(stats.writeRow).toBe(1);
  const data = new Uint8Array(buffer.getTexture().image.data);
  expect(Array.from(data.slice(0, BIN_COUNT))).toEqual(Array.from(c));
  expect(Array.from(data.slice(BIN_COUNT, BIN_COUNT * 2))).toEqual(Array.from(b));
});

/**
 * Ensure clear resets counters and zeroes texture data.
 */
test('clear empties the buffer', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'UNORM8',
    linearFilter: false,
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL1_NO_EXT, config);
  buffer.pushRow(new Uint8Array([1, 1, 1]));
  buffer.clear();
  const stats = buffer.getStats();
  expect(stats.rowCount).toBe(0);
  expect(stats.writeRow).toBe(0);
  const data = new Uint8Array(buffer.getTexture().image.data);
  expect(Array.from(data)).toEqual(new Array(BIN_COUNT * MAX_ROWS).fill(0));
});

/**
 * Ensure resize allocates new storage and resets state.
 */
test('resize reinitializes internal storage', () => {
  const config: RingBufferConfig = {
    binCount: 2,
    maxRows: 2,
    format: 'UNORM8',
    linearFilter: false,
  };
  const buffer = new SpectroRingBuffer(GL_WEBGL1_NO_EXT, config);
  buffer.pushRow(new Uint8Array([1, 1]));
  buffer.resize(4, 3);
  const stats = buffer.getStats();
  expect(stats.binCount).toBe(4);
  expect(stats.maxRows).toBe(3);
  expect(stats.rowCount).toBe(0);
  expect(stats.writeRow).toBe(0);
  expect(buffer.getTexture().image.width).toBe(4);
  expect(buffer.getTexture().image.height).toBe(3);
});

