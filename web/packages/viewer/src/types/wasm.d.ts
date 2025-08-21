/**
 * Type declarations for mocked WASM bindings used in tests.
 * What: Defines minimal types for stftFrame to satisfy the TypeScript compiler.
 * Why: Prevents typecheck failures when the actual WASM module is absent.
 */
declare module '@spectro/wasm-bindings' {
  /**
   * Mocked Short-time Fourier Transform function.
   * What: Accepts a window of samples and returns frequency bins.
   * Why: Allows unit tests to run without the real WASM implementation.
   */
  export function stftFrame(
    data: Float32Array,
    window: string,
    reference: number
  ): Promise<Float32Array>;
}
