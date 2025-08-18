import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
  resolve: {
    alias: {
      '@spectro/wasm-bindings': resolve(__dirname, '../../packages/wasm-bindings/dist/index.js'),
      '@spectro/viewer': resolve(__dirname, '../../packages/viewer/dist/index.js')
    }
  },
  optimizeDeps: {
    include: ['@spectro/wasm-bindings', '@spectro/viewer']
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public'
})


