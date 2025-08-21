import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  initWasm,
  fftReal,
  applyWindow,
  stftFrame,
  magnitudeDbfs
} from '../src/index.ts';

/**
 * Expected MIME type for WASM responses.
 * Why: ensures `instantiateStreaming` can compile without fallback.
 */
const WASM_CONTENT_TYPE = 'application/wasm';

/**
 * Deterministic sample data for DSP routines.
 * How: short alternating values exercise positive/negative paths.
 */
const TEST_SIGNAL_VALUES = [1, -1, 0.5, -0.5] as const;

// Allow wasm-pack's browser loader to fetch local files in Node.
/** Preserve original fetch implementation for cleanup. */
const realFetch = globalThis.fetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis.fetch as any) = async (input: any, init?: any): Promise<Response> => {
  if (typeof input === 'string' && input.startsWith('file://')) {
    const data = await readFile(fileURLToPath(input));
    return new Response(data, { headers: { 'Content-Type': WASM_CONTENT_TYPE } });
  }
  if (input instanceof URL && input.protocol === 'file:') {
    const data = await readFile(fileURLToPath(input));
    return new Response(data, { headers: { 'Content-Type': WASM_CONTENT_TYPE } });
  }
  return realFetch(input, init);
};

/** Flag indicating whether streaming compilation was exercised. */
let streamingUsed = false;
/** Preserve original instantiateStreaming to restore after test. */
const realInstantiateStreaming = WebAssembly.instantiateStreaming;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(WebAssembly as any).instantiateStreaming = async (
  source: Promise<Response> | Response,
  importObject?: Record<string, unknown>
) => {
  streamingUsed = true;
  return realInstantiateStreaming(source, importObject);
};

// Utility to create a simple test buffer
function makeInput(): Float32Array {
  return new Float32Array(TEST_SIGNAL_VALUES);
}

test('WASM bindings execute and validate inputs', async () => {
  await initWasm();
  assert.ok(streamingUsed, 'instantiateStreaming should be used for init');
  WebAssembly.instantiateStreaming = realInstantiateStreaming;

  const fft = await fftReal(makeInput());
  assert.equal(fft.length, 8);

  const win = await applyWindow(makeInput(), 'hann');
  assert.equal(win.length, 4);

  const stft = await stftFrame(makeInput(), 'hann');
  assert.equal(stft.length, 4);

  const mag = await magnitudeDbfs(makeInput());
  assert.equal(mag.length, 4);

  await assert.rejects(() => fftReal(new Float32Array([])));
  await assert.rejects(() => applyWindow(new Float32Array([1]), 'bogus' as any));
  await assert.rejects(() => stftFrame(new Float32Array([1]), 'hann', 0));
  await assert.rejects(() => magnitudeDbfs(new Float32Array([1]), -1));
});
