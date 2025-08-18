/**
 * WASM bindings loader and typed facade over spectro_dsp crate.
 * What: Provides async initialization and safe wrappers.
 * Why: Decouple app code from raw wasm-pack output and keep a stable TS API.
 * NOTE: Never edit generated files under web/crates/*/pkg. This layer abstracts them.
 */

type WasmExports = {
  memory: WebAssembly.Memory;
  __wbindgen_malloc: (bytes: number, align: number) => number;
  __wbindgen_realloc: (ptr: number, oldBytes: number, newBytes: number, align: number) => number;
  __wbindgen_free: (ptr: number, bytes: number, align: number) => void;
  fft_real: (ptr: number, len: number) => [number, number];
  apply_window: (ptrIn: number, lenIn: number, ptrStr: number, lenStr: number) => [number, number];
  stft_frame: (ptrIn: number, lenIn: number, ptrStr: number, lenStr: number, reference: number) => [number, number];
  magnitude_dbfs: (ptrIn: number, lenIn: number, reference: number) => [number, number];
};

let wasmExports: WasmExports | null = null;
let initPromise: Promise<WasmExports> | null = null;

function getMemF32(wasm: WasmExports): Float32Array {
  return new Float32Array(wasm.memory.buffer);
}

function passArrayF32(wasm: WasmExports, input: Float32Array): { ptr: number; len: number } {
  const bytes = input.length * 4;
  const ptr = wasm.__wbindgen_malloc(bytes, 4) >>> 0;
  getMemF32(wasm).set(input, ptr / 4);
  return { ptr, len: input.length };
}

function getArrayF32(wasm: WasmExports, ptr: number, len: number): Float32Array {
  return getMemF32(wasm).subarray(ptr / 4, ptr / 4 + len).slice();
}

function passStringAscii(wasm: WasmExports, str: string): { ptr: number; len: number } {
  // Window type strings are ASCII; keep it simple
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const ptr = wasm.__wbindgen_malloc(bytes.length, 1) >>> 0;
  new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
  return { ptr, len: bytes.length };
}

/** Initialize the WASM module (idempotent). */
export async function initWasm(): Promise<WasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const mod = await import('../../../crates/dsp_core/pkg/spectro_dsp.js');
    if (!mod?.default || typeof mod.default !== 'function') {
      initPromise = null;
      throw new Error('WASM module missing default initialization function');
    }

    // Important: rely on wasm-bindgen loader to resolve the .wasm URL.
    const exports = (await mod.default()) as unknown as WasmExports;

    // Basic sanity checks on returned exports
    if (!exports?.memory || typeof exports.__wbindgen_malloc !== 'function') {
      initPromise = null;
      throw new Error('Invalid WASM exports after initialization');
    }

    wasmExports = exports;
    return exports;
  })();

  return initPromise;
}

/** Compute FFT (real→complex interleaved) via WASM. */
export async function fftReal(input: Float32Array): Promise<Float32Array> {
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  const [outPtr, outLen] = wasm.fft_real(ptr, len);
  const out = getArrayF32(wasm, outPtr, outLen);
  wasm.__wbindgen_free(outPtr, outLen * 4, 4);
  return out;
}

/** Apply window function to input buffer via WASM. */
export async function applyWindow(input: Float32Array, windowType: 'hann' | 'hamming' | 'blackman' | 'none'): Promise<Float32Array> {
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  const { ptr: strPtr, len: strLen } = passStringAscii(wasm, windowType === 'none' ? 'rect' : windowType);
  const [outPtr, outLen] = wasm.apply_window(ptr, len, strPtr, strLen);
  const out = getArrayF32(wasm, outPtr, outLen);
  wasm.__wbindgen_free(outPtr, outLen * 4, 4);
  return out;
}

/** Compute complete STFT frame: window + FFT + magnitude via WASM. */
export async function stftFrame(input: Float32Array, windowType: 'hann' | 'hamming' | 'blackman' | 'none', reference = 1.0): Promise<Float32Array> {
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  const { ptr: strPtr, len: strLen } = passStringAscii(wasm, windowType === 'none' ? 'rect' : windowType);
  const [outPtr, outLen] = wasm.stft_frame(ptr, len, strPtr, strLen, reference);
  const out = getArrayF32(wasm, outPtr, outLen);
  wasm.__wbindgen_free(outPtr, outLen * 4, 4);
  return out;
}

/** Compute magnitude spectrum in dBFS from a real block in WASM. */
export async function magnitudeDbfs(input: Float32Array, reference = 1.0): Promise<Float32Array> {
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  const [outPtr, outLen] = wasm.magnitude_dbfs(ptr, len, reference);
  const out = getArrayF32(wasm, outPtr, outLen);
  wasm.__wbindgen_free(outPtr, outLen * 4, 4);
  return out;
}

/** Spectro meta DTO mirrored from Rust for convenience. */
export interface SpectroMetaDto {
  streamId: string;
  channels: number;
  sampleRateHz: number;
  nfft: number;
  hopSize: number;
}

