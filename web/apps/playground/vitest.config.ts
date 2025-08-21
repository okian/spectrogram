import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Helper to build absolute paths relative to this config file.
const r = (p: string) => resolve(fileURLToPath(new URL('.', import.meta.url)), p);

/**
 * Vitest configuration for the playground app.
 * What: Runs lightweight unit tests in a Node environment.
 * Why: Ensures utility helpers behave correctly with coverage metrics.
 * How: Enforces minimum coverage thresholds for confidence.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Stub WASM bindings to avoid compiling native code during tests.
      '@spectro/wasm-bindings': r('./src/__mocks__/wasm.ts')
    }
  },
  test: {
    environment: 'node',
    // Only run tests in the dedicated test directory.
    include: ['test/**/*.test.ts'],
    // Exclude legacy test scaffold lacking assertions.
    exclude: ['src/wasm-test.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/palette-utils.ts'],
      lines: 50,
      functions: 50,
      statements: 50,
      branches: 50
    }
  }
});
