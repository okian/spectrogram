import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rename, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
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

/** Relative path from this test file to the wasm-pack output directory.
 * Why: ensures generated artifacts are present when tests run.
 */
const PKG_DIR_RELATIVE = '../pkg';

// Allow wasm-pack's browser loader to fetch local files in Node.
/** Preserve original fetch implementation for cleanup. */
const realFetch = globalThis.fetch;
/** Fetch implementation that serves `file://` URLs from disk. */
const fileFetch: typeof fetch = async (input: any, init?: any): Promise<Response> => {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis.fetch as any) = fileFetch as any;

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

/**
 * Create a simple deterministic input buffer for testing routines.
 */
function makeInput(): Float32Array {
  return new Float32Array(TEST_SIGNAL_VALUES);
}

/**
 * Ensure initWasm reports a helpful error when the generated bundle is missing.
 */
test('initWasm throws clear error when WASM bundle is missing', async () => {
  const wasmJsPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../pkg/spectro_dsp.js'
  );
  const backupPath = `${wasmJsPath}.bak`;
  await rename(wasmJsPath, backupPath);
  try {
    await assert.rejects(initWasm(), { message: /WASM bundle not found/ });
  } finally {
    await rename(backupPath, wasmJsPath);
  }
});

/**
 * Ensure initWasm surfaces a helpful message when network fetch fails.
 */
test('initWasm throws clear error on network failure', async () => {
  // Replace fetch with a stub that simulates a network failure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const failingFetch: typeof fetch = async (): Promise<Response> => {
    throw new TypeError('Failed to fetch');
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis.fetch as any) = failingFetch as any;
  try {
    await assert.rejects(initWasm(), { message: /WASM bundle not found/ });
  } finally {
    // Restore the file-backed fetch for subsequent tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.fetch as any) = fileFetch as any;
  }
 * Confirm wasm-pack output exists so consumers aren't missing runtime files.
 */
test('pkg directory exists after build step', async () => {
  /** Absolute path to the wasm-pack output folder under test. */
  const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), PKG_DIR_RELATIVE);
  /** Whether the pkg directory exists on disk. */
  const pkgPresent = await stat(pkgDir)
    .then(() => true)
    .catch(() => false);
  assert.ok(pkgPresent, 'pkg directory should exist when build:wasm has run');
});

/**
 * Validate that the bindings load correctly and enforce parameter checks.
 */
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
