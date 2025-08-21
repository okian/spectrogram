import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Dev server port.
 * Why: avoid magic numbers for clarity and maintainability.
 */
const DEV_SERVER_PORT = 5175

/**
 * MIME type served for WebAssembly binaries.
 * Why: ensure browsers can stream WASM via `instantiateStreaming`.
 */
const WASM_CONTENT_TYPE = 'application/wasm'

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEV_SERVER_PORT,
    /**
     * Explicit MIME mapping so `.wasm` files are served correctly.
     * How: Vite dev server will attach the proper `Content-Type` header.
     */
    mimeTypes: { '.wasm': WASM_CONTENT_TYPE }
  },
  resolve: {
    alias: {
      '@spectro/wasm-bindings': resolve(
        __dirname,
        '../../packages/wasm-bindings/dist/index.js'
      ),
      '@spectro/viewer': resolve(
        __dirname,
        '../../packages/viewer/dist/index.js'
      )
    }
  },
  optimizeDeps: {
    include: ['@spectro/wasm-bindings', '@spectro/viewer']
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public'
})


