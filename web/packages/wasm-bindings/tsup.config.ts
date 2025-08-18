import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  loader: {
    '.wasm': 'copy'
  },
  external: ['../../../crates/dsp_core/pkg/spectro_dsp_bg.wasm']
});
