/**
 * Ambient type declarations for the wasm-bindgen generated spectro_dsp package.
 * What: Exposes the subset of bindings required by this project.
 * Why: wasm-pack output lacks TypeScript types, so dynamic imports were untyped.
 * How: Declare the module's exports so consumers can import with full type safety.
 */
declare module '../pkg/spectro_dsp.js' {
  /** Types accepted by the default initialization function. */
  type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

  /** Forward real-to-complex FFT implemented in Rust. */
  export function fft_real(input: Float32Array): Float32Array;

  /** Apply a window function to the input buffer. */
  export function apply_window(input: Float32Array, window_type: string): Float32Array;

  /** Compute an STFT frame: windowing, FFT and magnitude. */
  export function stft_frame(
    input: Float32Array,
    window_type: string,
    reference: number
  ): Float32Array;

  /** Magnitude spectrum computation in dBFS. */
  export function magnitude_dbfs(input: Float32Array, reference: number): Float32Array;

  /** Exposed linear memory for low level diagnostics. */
  export const memory: WebAssembly.Memory;

  /** Initialise the WASM module, optionally providing a custom source. */
  export default function init(input?: InitInput): Promise<void>;
}
