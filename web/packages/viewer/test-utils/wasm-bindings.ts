/**
 * Test stub for WASM bindings.
 * What: Provides a minimal stftFrame implementation for tests.
 * Why: Avoids heavy WASM dependency during unit testing.
 */
export async function stftFrame(): Promise<Float32Array> {
  return new Float32Array();
}
