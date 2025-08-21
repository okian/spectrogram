/**
 * Minimal stub of WASM bindings for tests.
 * What: Provides dummy implementations of exported functions.
 * Why: The real WASM module requires compilation and is unnecessary for unit tests.
 */
export const stftFrame = () => ({ magnitudes: new Float32Array() });
