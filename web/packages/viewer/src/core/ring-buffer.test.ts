import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SpectroRingBuffer, RingBufferConfig } from './ring-buffer.ts';

/** Dummy WebGL context for tests. */
const DUMMY_GL = {} as WebGLRenderingContext;

/** Standard bin count used across tests. */
const BIN_COUNT = 3;
/** Standard row capacity for buffers under test. */
const MAX_ROWS = 4;

/**
 * Verify R32F data is stored and typed correctly.
 * What: Ensures float32 rows populate the buffer and texture reports FloatType.
 * Why: Confirms highest precision path for spectrogram data.
 */
test('stores R32F rows without modification', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R32F',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(DUMMY_GL, config);
  const row = new Float32Array([1, 0.5, 0]);
  buffer.pushRow(row);
  assert.equal(buffer.getStats().rowCount, 1);
  const stored = new Float32Array(buffer.getTexture().image.data.slice(0, BIN_COUNT));
  assert.deepEqual(stored, row);
  assert.equal(buffer.getTexture().type, THREE.FloatType);
});

/**
 * Verify R16F configuration uses half float texture type.
 * What: Ensures float32 input is accepted and texture type set to HalfFloatType.
 * Why: Validates reduced-precision path for memory savings.
 */
test('accepts R16F configuration with float rows', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R16F',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(DUMMY_GL, config);
  const row = new Float32Array([0, 0.25, 0.5]);
  buffer.pushRow(row);
  const stored = new Float32Array(buffer.getTexture().image.data.slice(0, BIN_COUNT));
  assert.deepEqual(stored, row);
  assert.equal(buffer.getTexture().type, THREE.HalfFloatType);
});

/**
 * Verify UNORM8 data handling.
 * What: Confirms byte rows are stored directly and texture type is UnsignedByteType.
 * Why: Provides lowest memory path for constrained devices.
 */
test('stores UNORM8 byte rows', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'UNORM8',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(DUMMY_GL, config);
  const row = new Uint8Array([0, 128, 255]);
  buffer.pushRow(row);
  const stored = new Uint8Array(buffer.getTexture().image.data.slice(0, BIN_COUNT));
  assert.deepEqual(stored, row);
  assert.equal(buffer.getTexture().type, THREE.UnsignedByteType);
});

/**
 * Ensure mismatched bin counts throw clear errors.
 * What: Guards against silent texture corruption when rows are mis-sized.
 * Why: Defensive programming prevents hard-to-debug GPU issues.
 */
test('throws for incorrect bin length', () => {
  const config: RingBufferConfig = {
    binCount: BIN_COUNT,
    maxRows: MAX_ROWS,
    format: 'R32F',
    linearFilter: false
  };
  const buffer = new SpectroRingBuffer(DUMMY_GL, config);
  assert.throws(() => buffer.pushRow(new Float32Array([0, 1])), /Expected 3 bins/);
});
