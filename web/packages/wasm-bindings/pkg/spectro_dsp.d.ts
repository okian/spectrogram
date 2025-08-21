/**
 * Type declarations for the wasm-bindgen generated spectro_dsp package.
 * What: exposes the subset of exports consumed by the TypeScript wrapper.
 * Why: provides static typing so consumers no longer require ts-ignore hacks.
 */

/**
 * Perform a forward real-to-complex FFT.
 * @param input Real-valued time-domain samples.
 * @returns Interleaved complex spectrum [re0, im0, re1, im1, ...].
 */
export function fft_real(input: Float32Array): Float32Array;

/**
 * Apply a named window function to the input buffer.
 * @param input Buffer to window in-place.
 * @param window_type Name of the window (e.g., "hann").
 * @returns Windowed buffer.
 */
export function apply_window(input: Float32Array, window_type: string): Float32Array;

/**
 * Compute a single short-time Fourier transform frame.
 * @param input Time-domain samples for the frame.
 * @param window_type Window to apply prior to FFT.
 * @param reference Reference magnitude for dBFS conversion.
 * @returns Magnitude spectrum for the frame.
 */
export function stft_frame(
  input: Float32Array,
  window_type: string,
  reference: number
): Float32Array;

/**
 * Convert a real block into its magnitude spectrum in dBFS.
 * @param input Real-valued samples to analyse.
 * @param reference Reference magnitude for dBFS conversion.
 * @returns Magnitude spectrum in dBFS.
 */
export function magnitude_dbfs(
  input: Float32Array,
  reference: number
): Float32Array;

/**
 * Exposed linear memory for low-level diagnostics.
 */
export const memory: WebAssembly.Memory;

/**
 * Initialise the underlying WebAssembly module.
 * @param module_or_path Optional path or precompiled module to load.
 * @returns Resolves when the module has been initialised.
 */
export default function init(
  module_or_path?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module
): Promise<void>;
