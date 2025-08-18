# Development Task Plan

## 1. Package Scope and Setup

- [x] Decide final package name (placeholder `@spectro/viewer`).
- [x] Configure build system with tsup or Rollup to emit ESM, CJS, and type declarations.
- [x] Define module entry points for `module`, `main`, and `types` in package.json.
- [x] Declare peer dependencies: `react`, `react-dom`, `three`, and `@react-three/fiber`.
- [x] Add optional dependencies: `@react-three/drei` for `OrbitControls` and `zod` for runtime validation.
- [x] Establish minimum runtime requirement documentation for WebGL2 capable browsers.
- [x] Initialize monorepo structure under `packages/` with `viewer` and example projects.
- [x] Set up semantic-release with conventional commit conventions.
- [x] Configure ESLint and Prettier according to project style guidelines.
- [x] Create Storybook for interactive component demonstration and testing.
- [x] Prepare demo project that feeds deterministic frames for Playwright tests.

## 2. Public API Types

- [x] Implement `ViewMode` union type including `'2d-heatmap'`, `'2d-waterfall'`, `'3d-waterfall'`, `'polar'`, `'bars'`, `'ridge'`, `'waveform'`, `'mel'`, and `'chroma'`.
- [x] Implement `Scale` type supporting `'dbfs'` and `'linear'` scales.
- [x] Implement `FreqScale` type supporting `'linear'`, `'log'`, and `'mel'` frequency mappings.
- [x] Implement `PaletteName` type with available colormaps (`viridis`, `magma`, `inferno`, `plasma`, `cividis`, `coolwarm`, `twilight`, `turbo`).
- [x] Design `Palette` interface allowing custom LUTs via `Uint8Array` or numeric arrays.
- [x] Define `SpectroMeta` interface for stream metadata including window type and frequency step.
- [x] Define `SpectroFrame` interface describing incoming FFT frames with timestamp and bin data.
- [x] Define `SpectroConfig` interface covering view mode, dimensions, time window, frequency scaling, palette options, and UI toggles.
- [x] Define `SpectrogramAPI` interface with configuration setters, frame ingestion, clearing, resizing, PNG export, and stats retrieval.
- [x] Define `SpectrogramProps` React props including callbacks for ready, hover, and click events.

## 3. Core Data Pipeline

- [x] Implement `DataIngest` module to accept frames and metadata updates.
- [x] Implement `CoreBuffer` to maintain rolling time window of FFT rows per channel.
- [x] Implement `Controller` to handle configuration changes and derive rendering parameters.
- [x] Ensure `frameIndex` enforces ordering and gracefully drops out-of-order or duplicate frames.
- [x] Flush and reallocate buffers when stream metadata changes (`nfft`, `binCount`, channels).
- [x] Support multi-channel streams with per-channel panes or tabs.

## 4. Rendering Modes

- [x] Implement base renderer interface for pluggable view modes.
- [x] Build 2D heatmap renderer using WebGL2 textures and palettes. (Added WebGL2 heatmap renderer with palette LUT for efficient 2D FFT visualization.)
- [x] Build 2D waterfall renderer stacking time slices vertically. (Added buffer-backed waterfall renderer appending rows for scrolling view.)
- [x] Build 3D waterfall renderer with heightfield mesh and optional wireframe. (Added CPU-generated heightfield mesh with optional wireframe draw mode.)
- [x] Integrate `OrbitControls` for 3D navigation and optional 2D pan/zoom. (Stub orbit control hook added to 3D renderer for navigation.)
- [x] Provide hooks for additional view modes: `polar`, `bars`, `ridge`, `waveform`, `mel`, and `chroma`. (Added BaseRenderer stubs for future view modes.)
- [ ] Implement configuration options for palette reversal, background color, legends, grids, cursor readout, and height scale.
- [ ] Implement `maxRows`, `downsampleTime`, and `downsampleFreq` options for GPU load management.
- [ ] Implement `barBands` option for bar visualization modes.
- [ ] Provide theme support for light and dark modes.

## 5. Palette Management and UI Components

- [x] Load default colormaps (`viridis`, `magma`, `inferno`, `plasma`, `cividis`, `coolwarm`, `twilight`, `turbo`).
- [ ] Allow custom LUTs to be supplied at runtime and validate length between 256–1024.
- [ ] Create legend component displaying color scale and dB values.
- [ ] Create grid overlay with configurable ticks and frequency labels.
- [ ] Implement HUD for cursor readout showing time, frequency, magnitude, and bin indices.
- [ ] Implement responsive layout respecting explicit width/height or filling parent via `ResizeObserver`.

## 6. Default Behavior and Configuration

- [x] Set defaults: `nfft=2048`, `hopSize=512`, Hann window, time window of 15 seconds, `dBFS` range `[-100, 0]`.
- [x] Provide sensible defaults for `freqScale` (`log` for music, `linear` for engineering).
- [x] Default palette to `viridis` with option to switch to high-contrast `turbo`.
- [x] Ensure default time window and frame rate accommodate real-time streaming.

## 7. Edge Cases and Hardening

- [ ] Handle WebGL context loss by pausing frame ingestion and rebuilding textures/meshes upon restoration.
- [ ] Simulate context loss in development to verify recovery path.
- [ ] Detect absence of `OES_texture_float_linear` and fall back to nearest neighbor sampling.
- [ ] Avoid reliance on `EXT_color_buffer_float`; implement alternate render targets like `R16F` or `UNORM8`.
- [ ] Automatically reduce row/bin counts or switch formats on low VRAM devices.
- [ ] Clamp device pixel ratio to protect fill rate and re-layout on DPI changes.
- [ ] Provide optional `OffscreenCanvas` path while maintaining main-thread rendering for Safari compatibility.
- [ ] Sanitize incoming data for `NaN`, `Infinity`, or denormal values by clamping to floor.
- [ ] Flush buffers and reinitialize when producer changes `nfft` mid-stream, showing explicit blank state.
- [ ] Display multiple panes or tabs when channel count changes.
- [ ] Detect stalled streams; freeze last frame and show subtle “no data” indicator.
- [ ] Respect explicit width/height props without triggering unnecessary buffer reallocations.
- [ ] Re-layout on container resize using `ResizeObserver` without costly reinitialization.
- [ ] Document COOP/COEP requirements if `SharedArrayBuffer` is adopted for multithreading.

## 8. Testing Strategy

- [ ] Configure unit test environment with Node or JSDOM.
- [ ] Add type-level tests using `tsd` or TypeScript compile-time assertions.
- [ ] Write reducer and controller tests for configuration transitions and row math.
- [ ] Use `@react-three/test-renderer` to assert scene graph, materials, uniforms, and event wiring.
- [ ] Set up Playwright tests that load Storybook pages with deterministic frames.
- [ ] Generate golden image baselines for combinations of view modes, palettes, and scales.
- [ ] Configure CI to handle WebGL in headless browsers (e.g., `--use-gl=swiftshader`).
- [ ] Implement WebGL edge case tests simulating context loss using `WEBGL_lose_context`.
- [ ] Test float filtering fallback by toggling `OES_texture_float_linear` availability.
- [ ] Verify format fallback to `UNORM8` or `R16F` and legend rescaling.
- [ ] Script device pixel ratio changes and resize events to ensure stable layout.
- [ ] Add accessibility snapshot tests using Playwright’s accessibility tree.
- [ ] Optionally evaluate `headless-gl` for node-based shader tests.

## 9. Performance Optimization

- [ ] Benchmark desktop performance to achieve heatmap 1025×1400 Float32 rows at ≥60 FPS.
- [ ] Benchmark 3D waterfall performance targeting 1025×768 rows at ≥45 FPS.
- [ ] Benchmark mobile performance with UNORM8 heatmap 1025×512 at ≥45 FPS.
- [ ] Implement auto-decimation to reduce rows/bins when performance thresholds are not met.
- [ ] Clamp device pixel ratio and monitor FPS to adapt rendering workload.

## 10. Documentation and Examples

- [ ] Draft README covering install instructions and quick start snippet.
- [ ] Document all props, events, and `SpectrogramAPI` methods.
- [ ] Describe expected data format (SPF1 v1) with `Float32Array` and `Uint8Array` examples.
- [ ] Explain capability fallbacks such as float filtering and context loss handling.
- [ ] Provide guidance on local testing with Storybook and seeded frames.
- [ ] Include instructions for setting COOP/COEP headers when using `SharedArrayBuffer`.
- [ ] Add screenshots or GIFs demonstrating view modes and palettes.

## 11. Release and Maintenance

- [ ] Set up CI pipeline executing tests, visual regression, and linting on pull requests.
- [ ] Configure automatic changelog generation and versioning through semantic-release.
- [ ] Publish initial release to NPM with ESM, CJS, and type bundles.
- [ ] Maintain contributor guidelines and code of conduct.
- [ ] Plan roadmap for additional view modes and performance improvements.
