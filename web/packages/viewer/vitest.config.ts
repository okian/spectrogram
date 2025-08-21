/**
 * Vitest configuration for viewer package.
 * What: Enables unit testing with coverage reporting.
 * Why: Ensures code correctness and guards against regressions.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text']
    }
  },
  resolve: {
    alias: {
      '@spectro/wasm-bindings': new URL('./test-utils/wasm-bindings.ts', import.meta.url).pathname
    }
  }
});
