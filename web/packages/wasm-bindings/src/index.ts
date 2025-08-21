/**
 * WASM bindings loader and typed facade over spectro_dsp crate.
 * What: Provides async initialization and safe wrappers.
 * Why: Decouple app code from raw wasm-pack output and keep a stable TS API.
 * NOTE: Never edit generated files under web/crates/(crate)/pkg. This layer abstracts them.
 */

type WasmExports = {
  /** Linear memory shared with the WASM module. */
  memory: WebAssembly.Memory;
  /** Allocator hook provided by wasm-bindgen. */
  __wbindgen_malloc: (bytes: number, align: number) => number;
  /** Reallocator hook provided by wasm-bindgen. */
  __wbindgen_realloc: (
    ptr: number,
    oldBytes: number,
    newBytes: number,
    align: number,
  ) => number;
  /** Free hook provided by wasm-bindgen. */
  __wbindgen_free: (ptr: number, bytes: number, align: number) => void;
  /** FFT operation exported from Rust. */
  fft_real: (ptr: number, len: number) => [number, number];
  /** Windowing operation exported from Rust. */
  apply_window: (
    ptrIn: number,
    lenIn: number,
    ptrStr: number,
    lenStr: number,
  ) => [number, number];
  /** Full STFT frame generator exported from Rust. */
  stft_frame: (
    ptrIn: number,
    lenIn: number,
    ptrStr: number,
    lenStr: number,
    reference: number,
  ) => [number, number];
  /** Magnitude spectrum calculation exported from Rust. */
  magnitude_dbfs: (
    ptrIn: number,
    lenIn: number,
    reference: number,
  ) => [number, number];
};

/** Bytes per 32-bit float – used for alignment when passing arrays. */
const BYTES_F32 = 4;
/** Alignment for ASCII strings (one byte per character). */
const ALIGN_U8 = 1;

/** Supported window types for WASM routines. */
const WINDOW_TYPES = ['hann', 'hamming', 'blackman', 'none'] as const;

let wasmExports: WasmExports | null = null;
let initPromise: Promise<WasmExports> | null = null;

/**
 * Obtain a view of WASM memory as Float32Array.
 * Why: simplifies copying data into/out of the linear memory buffer.
 */
function getMemF32(wasm: WasmExports): Float32Array {
  return new Float32Array(wasm.memory.buffer);
}

/**
 * Allocate and copy a Float32Array into WASM memory.
 * @returns pointer and element length of the written array.
 */
function passArrayF32(
  wasm: WasmExports,
  input: Float32Array,
): { ptr: number; len: number } {
  const bytes = input.length * BYTES_F32;
  const ptr = wasm.__wbindgen_malloc(bytes, BYTES_F32) >>> 0;
  getMemF32(wasm).set(input, ptr / BYTES_F32);
  return { ptr, len: input.length };
}

/**
 * Copy a Float32Array out of WASM memory.
 * Why: the returned array must survive after we free the WASM buffer.
 */
function getArrayF32(
  wasm: WasmExports,
  ptr: number,
  len: number,
): Float32Array {
  return getMemF32(wasm).subarray(ptr / BYTES_F32, ptr / BYTES_F32 + len).slice();
}

/**
 * Allocate and copy an ASCII string into WASM memory.
 * @returns pointer and byte length of the encoded string.
 */
function passStringAscii(
  wasm: WasmExports,
  str: string,
): { ptr: number; len: number } {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const ptr = wasm.__wbindgen_malloc(bytes.length, ALIGN_U8) >>> 0;
  new Uint8Array(wasm.memory.buffer).set(bytes, ptr);
  return { ptr, len: bytes.length };
}

/** Initialize the WASM module (idempotent). */
export async function initWasm(): Promise<WasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // WASM loader lacks type declarations; ignore for type checking.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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

/**
 * Compute FFT (real→complex interleaved) via WASM.
 * Validates input and ensures all allocated memory is freed.
 */
export async function fftReal(input: Float32Array): Promise<Float32Array> {
  if (!(input instanceof Float32Array)) {
    throw new TypeError('fftReal expects a Float32Array input');
  }
  if (input.length === 0) {
    throw new Error('fftReal requires a non-empty input array');
  }
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  try {
    const [outPtr, outLen] = wasm.fft_real(ptr, len);
    const out = getArrayF32(wasm, outPtr, outLen);
    wasm.__wbindgen_free(outPtr, outLen * BYTES_F32, BYTES_F32);
    return out;
  } finally {
    wasm.__wbindgen_free(ptr, len * BYTES_F32, BYTES_F32);
  }
}

/**
 * Apply a window function to the input buffer via WASM.
 * Frees both numeric input and window type string after the call.
 */
export async function applyWindow(
  input: Float32Array,
  windowType: 'hann' | 'hamming' | 'blackman' | 'none',
): Promise<Float32Array> {
  if (!(input instanceof Float32Array)) {
    throw new TypeError('applyWindow expects a Float32Array input');
  }
  if (input.length === 0) {
    throw new Error('applyWindow requires a non-empty input array');
  }
  if (!WINDOW_TYPES.includes(windowType)) {
    throw new Error(`Unknown window type: ${windowType}`);
  }
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  const { ptr: strPtr, len: strLen } = passStringAscii(
    wasm,
    windowType === 'none' ? 'rect' : windowType,
  );
  try {
    const [outPtr, outLen] = wasm.apply_window(ptr, len, strPtr, strLen);
    const out = getArrayF32(wasm, outPtr, outLen);
    wasm.__wbindgen_free(outPtr, outLen * BYTES_F32, BYTES_F32);
    return out;
  } finally {
    wasm.__wbindgen_free(ptr, len * BYTES_F32, BYTES_F32);
    wasm.__wbindgen_free(strPtr, strLen, ALIGN_U8);
  }
}

/**
 * Compute complete STFT frame: window + FFT + magnitude via WASM.
 * Ensures both input buffer and window type string are freed.
 */
export async function stftFrame(
  input: Float32Array,
  windowType: 'hann' | 'hamming' | 'blackman' | 'none',
  reference = 1.0,
): Promise<Float32Array> {
  if (!(input instanceof Float32Array)) {
    throw new TypeError('stftFrame expects a Float32Array input');
  }
  if (input.length === 0) {
    throw new Error('stftFrame requires a non-empty input array');
  }
  if (!WINDOW_TYPES.includes(windowType)) {
    throw new Error(`Unknown window type: ${windowType}`);
  }
  if (!Number.isFinite(reference) || reference <= 0) {
    throw new Error('reference must be a positive finite number');
  }
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  const { ptr: strPtr, len: strLen } = passStringAscii(
    wasm,
    windowType === 'none' ? 'rect' : windowType,
  );
  try {
    const [outPtr, outLen] = wasm.stft_frame(ptr, len, strPtr, strLen, reference);
    const out = getArrayF32(wasm, outPtr, outLen);
    wasm.__wbindgen_free(outPtr, outLen * BYTES_F32, BYTES_F32);
    return out;
  } finally {
    wasm.__wbindgen_free(ptr, len * BYTES_F32, BYTES_F32);
    wasm.__wbindgen_free(strPtr, strLen, ALIGN_U8);
  }
}

/**
 * Compute magnitude spectrum in dBFS from a real block in WASM.
 * Frees the numeric input buffer after invocation.
 */
export async function magnitudeDbfs(
  input: Float32Array,
  reference = 1.0,
): Promise<Float32Array> {
  if (!(input instanceof Float32Array)) {
    throw new TypeError('magnitudeDbfs expects a Float32Array input');
  }
  if (input.length === 0) {
    throw new Error('magnitudeDbfs requires a non-empty input array');
  }
  if (!Number.isFinite(reference) || reference <= 0) {
    throw new Error('reference must be a positive finite number');
  }
  const wasm = await initWasm();
  const { ptr, len } = passArrayF32(wasm, input);
  try {
    const [outPtr, outLen] = wasm.magnitude_dbfs(ptr, len, reference);
    const out = getArrayF32(wasm, outPtr, outLen);
    wasm.__wbindgen_free(outPtr, outLen * BYTES_F32, BYTES_F32);
    return out;
  } finally {
    wasm.__wbindgen_free(ptr, len * BYTES_F32, BYTES_F32);
  }
}

/** Spectro meta DTO mirrored from Rust for convenience. */
export interface SpectroMetaDto {
  streamId: string;
  channels: number;
  sampleRateHz: number;
  nfft: number;
  hopSize: number;
}

