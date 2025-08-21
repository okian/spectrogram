import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Resolve helper to ensure cross-platform paths
const r = (p: string) => resolve(fileURLToPath(new URL('.', import.meta.url)), p);

/**
 * Vitest configuration for the viewer package.
 * What: Sets up a browser-like environment and coverage settings.
 * Why: Ensures tests run consistently and measure meaningful coverage.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Stub WASM bindings for tests
      '@spectro/wasm-bindings': r('./src/__mocks__/wasm.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/index.tsx', 'src/core/ring-buffer.ts'],
      lines: 50,
      functions: 50,
      statements: 50,
      branches: 50,
    },
  },

});
