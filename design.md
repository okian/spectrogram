
1) Package scope

Name (placeholder): @spectro/viewer
Targets: ESM (module), CJS (main), Types (types)
Peer deps: react, react-dom, three, @react-three/fiber
Optional deps: @react-three/drei (OrbitControls), zod (runtime validation)
Minimum runtime requirement: WebGL2 capable browser (fallbacks noted below)

Why R3F/Three? Declarative scene graph in React with proven ecosystem and OrbitControls out-of-the-box.  ￼ ￼ ￼

⸻

2) What the component does
	•	Renders spectrogram-like views from incoming STFT/FFT frames (you supply them from WASM).
	•	Supports these view modes (switchable at runtime):
	•	2d-heatmap (classic spectrogram)
	•	2d-waterfall (line/ridge stack)
	•	3d-waterfall (heightfield + OrbitControls)
	•	polar, bars, ridge, waveform, mel, chroma (pluggable; heatmap/2D/3D are first-class)
	•	Time windowed: shows last N seconds (e.g., 15 s), continuous scrolling.
	•	Fully configurable: palettes (viridis, magma, inferno, plasma, cividis, coolwarm, twilight, turbo, custom LUT), dB range, freq scale (linear/log/mel), legends, grid, height scale, etc. (Perceptually uniform colormaps recommended for analysis; Turbo available for high-contrast visuals.)  ￼ ￼ ￼ ￼

⸻

3) Public API (TypeScript)

// Enums
export type ViewMode =
  | '2d-heatmap' | '2d-waterfall' | '3d-waterfall'
  | 'polar' | 'bars' | 'ridge' | 'waveform' | 'mel' | 'chroma';

export type Scale = 'dbfs' | 'linear';
export type FreqScale = 'linear' | 'log' | 'mel';
export type PaletteName =
  | 'viridis' | 'magma' | 'inferno' | 'plasma' | 'cividis'
  | 'coolwarm' | 'twilight' | 'turbo';

export type Palette = PaletteName | { name: string; lut: Uint8Array | number[] }; // 256–1024 RGBA

// Stream metadata (call when parameters change)
export interface SpectroMeta {
  streamId: string;
  channels: number;           // # of channels in the stream
  sampleRateHz: number;
  nfft: number;
  hopSize: number;            // samples
  binCount: number;           // length of bins
  freqStartHz: number;        // typically 0
  freqStepHz: number;         // sampleRateHz / nfft
  scale: Scale;               // 'dbfs' or 'linear'
  freqScale?: FreqScale;      // default 'linear'
  window?: 'hann'|'hamming'|'blackman'|'kaiser'|'other';
}

// A single time-slice for one channel
export interface SpectroFrame {
  channelId: number;          // 0..channels-1
  frameIndex: number;         // monotonic per channel
  timestampUs: number;        // optional for host use
  bins: Float32Array | Uint16Array | Uint8Array; // length = binCount
}

// Viewer configuration (declarative)
export interface SpectroConfig {
  view?: ViewMode;
  width?: number;             // px; if omitted, fill parent
  height?: number;            // px; if omitted, 300
  timeWindowSec?: number;     // e.g., 15
  freqScale?: FreqScale;      // 'linear' | 'log' | 'mel'
  dbFloor?: number;           // e.g., -100
  dbCeiling?: number;         // e.g., 0
  palette?: Palette;          // default 'viridis'
  paletteReverse?: boolean;
  background?: string;        // css color
  heightScale?: number;       // 3D z-scale
  wireframe3D?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showCursorReadout?: boolean;
  orbitControls?: boolean;    // rotate/pan/zoom (3D & 2D)
  maxRows?: number;           // GPU cap; overrides derived
  downsampleTime?: number;    // 1=every row; 2=every other ...
  downsampleFreq?: number;    // bin decimation factor
  barBands?: 'octave'|'third'|'mel'|number;
  theme?: 'light'|'dark';
}

export interface SpectrogramAPI {
  setConfig(next: Partial<SpectroConfig>): void;
  setMeta(meta: SpectroMeta): void;
  pushFrame(frame: SpectroFrame): void;
  pushFrames(frames: SpectroFrame[]): void;
  clear(): void;
  resize(): void;                                   // call if container size changes
  exportPNG(opts?: { view?: ViewMode }): Promise<Blob>;
  stats(): { fps: number; dropped: number; rows: number; bins: number };
}

export type SpectrogramProps = {
  config?: SpectroConfig;
  className?: string;
  style?: React.CSSProperties;
  onReady?(api: SpectrogramAPI): void;
  onHover?(p: SpectroEvent): void;
  onClick?(p: SpectroEvent): void;
};

// SpectroEvent delivers time, frequency and magnitude details for a single data point.

Usage

import { Spectrogram, SpectrogramAPI, type SpectroEvent } from '@spectro/viewer';

function App() {
  const ref = React.useRef<SpectrogramAPI|null>(null);

  return (
    <Spectrogram
      config={{
        view: '3d-waterfall',
        width: 960, height: 540,
        timeWindowSec: 15,
        freqScale: 'log',
        palette: 'viridis',
        orbitControls: true,
        showLegend: true
      }}
      onReady={(api) => { ref.current = api; }}
      onHover={(p: SpectroEvent) => {/* ... */}}
      onClick={(p: SpectroEvent) => {/* ... */}}
    />
  );
}


⸻

4) Ingestion protocol (wire format) — SPF1 v1

There isn’t a standard “streaming spectrogram frame” for the web. Define this binary+JSON protocol to keep latency/overhead low and map directly to GPU textures.

Config JSON (send on connect and when changing parameters):

{
  "stream_id": "abc",
  "channels": 1,
  "sample_rate_hz": 48000,
  "nfft": 2048,
  "hop_size": 512,
  "bin_count": 1025,
  "scale": "dbfs",
  "freq_start_hz": 0,
  "freq_step_hz": 23.4375,
  "freq_scale": "linear",
  "window": "hann",
  "db_floor": -100,
  "db_ceiling": 0
}

Binary frame (per channel, per slice): 40-byte header + payload

0  char[4] magic "SPF1"
4  u8      version = 1
5  u8      flags (bit0=log_db, bit1=normalized_0_1, bit2=mel_bins, bit3=logFreq)
6  u16     channel_id
8  u32     sample_rate_hz
12 u32     nfft
16 u32     hop_size
20 u32     bin_count
24 u32     sample_bytes (4=F32, 2=U16, 1=U8)
28 u32     frame_index
32 u64     timestamp_us

Payload = bin_count * sample_bytes.
Prefer Float32 for fidelity; U8/U16 allowed (shader rescales against db_floor/db_ceiling).

⸻

5) Rendering architecture

5.1 Core choices
	•	Renderer: Three.js via React Three Fiber (R3F).  ￼ ￼
	•	Interaction: OrbitControls (rotate/zoom/pan; damping optional).  ￼ ￼
	•	Data storage: a GPU data-texture ring buffer (bins × rows). On each arriving frame, update one row via texSubImage2D. This avoids reallocations and CPU copies; it’s the standard fast path for streaming in WebGL. (Floating-point textures are core in WebGL2; filtering/render-to may require extensions.)  ￼ ￼
	•	Float textures & filtering:
	•	WebGL2 supports float textures; linear filtering of float often needs OES_texture_float_linear.
	•	Rendering to float FBOs needs EXT_color_buffer_float / WEBGL_color_buffer_float if you ever render into them.
We only sample from float textures for spectrograms, so rendering-to-float is not required.  ￼ ￼

5.2 Modules
	•	DataIngest
Decodes SPF1 frames (WebSocket/WebRTC) and enqueues per-channel. Handles out-of-order and drops.
	•	CoreBuffer
Owns the WebGL texture(s), writeRow, rowOffset, and capability detection: float support, linear filtering ext, etc. (If filtering ext missing, sample nearest and smooth in shader as needed.)  ￼
	•	Renderers (plug-in interface)
	•	2D Heatmap: fullscreen quad; fragment samples data texture, maps through 1D LUT texture (256–1024 RGBA).
	•	2D Waterfall: instanced line strips (one per time row), alpha fades with age; downsample bins for perf.
	•	3D Waterfall: heightfield mesh (rows × bins subdivisions); vertex displaces Z by magnitude; OrbitControls; optional wireframe.
	•	Polar: fragment-space polar remap (θ=time, r=freq).
	•	Bars: aggregate bins → bands (octave/third/mel or fixed N); draw instanced boxes with falloff.
	•	Ridge: 3×3 peak detect pass (shader or CPU), draw thin lines/points.
	•	Waveform: overlay 1D polyline synced to time window.
	•	Mel/Chroma: draw as compact heatmaps (prefer precomputed).
	•	LUT/Color
Built-in palettes with reversed variants. Prefer perceptually uniform colormaps (viridis, magma, inferno, plasma, cividis); turbo for vivid contrast.  ￼ ￼ ￼
	•	Axes/Legend/HUD
GPU legend bar + DOM labels; cursor readout (time, freq, mag dB, bin). Log frequency tick helper.
	•	Controller
Global state (meta/config), RAF scheduling, resize observer (if width/height omitted), DPR handling.

5.3 Sizing
	•	If config.width/height passed, size canvas to those px.
	•	Else: fill parent; listen to ResizeObserver; expose api.resize() for manual triggers.
	•	Respect window.devicePixelRatio but clamp DPR (e.g., ≤1.5–2) for perf.

5.4 Performance dials
	•	Texture formats: Prefer R32F → fallback R16F → UNORM8 (shader rescales).
	•	Decimation: downsampleTime (skip rows) and downsampleFreq (skip bins) per view.
	•	Row cap: maxRows to guard VRAM; re-derive from timeWindow+hop else.
	•	Backpressure: If ingest faster than render, drop oldest rows; never stall UI.
	•	Worker/OffscreenCanvas (optional): move rendering off the main thread; requires OffscreenCanvas and careful support across targets.  ￼
	•	SharedArrayBuffer (optional): zero-copy producer→viewer; requires cross-origin isolation (COOP/COEP).  ￼ ￼

⸻

6) Visualization behavior (non-ambiguous)

2D Heatmap
	•	X=time (left=old, right=new), Y=freq (bottom→top).
	•	Color = magnitude after normalization to [0,1] using (dbFloor, dbCeiling) for dBFS or min/max for linear.
	•	Legend shows scale, palette direction, numeric ticks; log frequency toggles octave lines.

2D Waterfall
	•	Each time slice draws a line strip over frequency; latest slice foremost.
	•	Alpha fades with age; configurable line width; optional depth separation.

3D Waterfall
	•	Mesh grid aligned so X=time (old→new), Y=freq, Z=height (magnitude).
	•	OrbitControls: rotate (LMB), zoom (wheel/pinch), pan (RMB/two-finger). Damping default on.  ￼ ￼
	•	Wireframe mode togglable; LUT colorization optional atop height shading.

Polar
	•	θ=time (wrapped around circle), r=freq. Center=lowest freq; configurable radial mapping (log/mel/linear).

Bars
	•	Aggregation mode (octave/third/mel/N). Optional peak-hold/falloff.

Ridge
	•	Peak detection threshold (dB). Draw ridge lines; optional label of fundamentals/harmonics.

Waveform
	•	Downsample to ~1–2px/column envelope (min/max). Shares time axis with heatmap.

⸻

7) Defaults (audio-friendly)
	•	nfft=2048, hop=512 (~10.7 ms @ 48 kHz), Hann, overlap ~75%.
	•	dBFS range [-100, 0].
	•	timeWindowSec=15.
	•	freqScale='log' for music, 'linear' for engineering.
	•	Palette 'viridis'; 'turbo' optional (note: not strictly perceptually uniform).  ￼ ￼ ￼

⸻

8) Edge cases & hardening (must-handle)

WebGL / GPU
	•	WebGL context lost / restored: listen for webglcontextlost / webglcontextrestored; pause ingest on loss; rebuild textures/meshes on restore. Add a self-test via WEBGL_lose_context in CI.  ￼
	•	Float texture filtering: if OES_texture_float_linear unavailable, fall back to nearest sampling; optionally shader-smooth.  ￼
	•	Render-to-float not assumed: avoid dependence on EXT_color_buffer_float; it’s not guaranteed on all devices (esp. mobile).  ￼ ￼
	•	Low VRAM / mobile: auto-reduce rows/bins and switch formats (R16F/UNORM8).
	•	Hi-DPI: clamp DPR to protect fill-rate; re-layout on DPR changes.
	•	OffscreenCanvas: optional; not uniformly supported on all Safari versions — keep main-thread path.  ￼ ￼

Data quality
	•	NaN/Inf/denormals: sanitize to floor.
	•	Out-of-order / duplicate frames: drop gracefully using frameIndex.
	•	Bin mismatch (producer changes nfft mid-stream): flush and reallocate texture; brief, explicit blank state.
	•	Channel changes: re-init per new channels; show panes or tabs.
	•	Stalled stream: freeze last frame; show subtle “no data” indicator; keep GPU alive.

Resizing / layout
	•	Respect explicit width/height props; otherwise fill parent with ResizeObserver.
	•	Don’t trigger reallocation unless rows/bins or formats change.

Security / hosting
	•	If you adopt SharedArrayBuffer: document COOP/COEP headers to users; GitHub Pages doesn’t set them for you.  ￼

⸻

9) Automated testing strategy (CI-first)

9.1 Unit & integration (Node/JSDOM)
	•	Type-level tests: tsd or TS compile tests for API shapes.
	•	Reducer/Controller tests: config transitions, row math, bin mapping.
	•	R3F scene tests with @react-three/test-renderer: assert scene graph, materials, uniforms, and event wiring without needing a browser GL.  ￼ ￼

9.2 Visual regression (golden images)
	•	Playwright in headless Chromium/Firefox/WebKit.
	•	Load a storybook page that feeds deterministic frames (seeded Float32 arrays) into the component.
	•	For each view mode × palette × scale combination (sampled set), call expect(page).toHaveScreenshot() for golden comparison. (Playwright has built-in screenshot diffing.)  ￼
	•	Organize baselines per-OS or generate on CI OS to avoid diffs from font/GPU variance.  ￼
	•	If you need custom diffs: pixelmatch or odiff for PNG comparisons.  ￼

Notes for CI: Some containers need flags to enable WebGL in headless Chrome (e.g., --use-gl=swiftshader / --disable-gpu-sandbox). There are known workarounds in Selenium/Chrome headless discussions.  ￼

9.3 WebGL edge-case tests (browser)
	•	Context loss simulation: use WEBGL_lose_context.loseContext() then restore; assert textures reallocate, ingest resumes, and FPS recovers.  ￼
	•	Float filtering capability: feature-detect OES_texture_float_linear and assert renderer falls back to nearest when missing.  ￼
	•	Format fallback: force UNORM8 path; verify legends rescale correctly.
	•	Resize/DPR: script DPR change and resize events; assert no exceptions and legends/axes reflow.

9.4 Optional server-side rendering checks

If you need pure Node GL testing (no browser), headless-gl can create WebGL contexts in Node for shader unit tests, but note it is WebGL1-focused and WebGL2 support is limited; prefer browser-based Playwright for WebGL2.  ￼ ￼

9.5 Accessibility smoke tests
	•	ARIA labels for buttons/toggles; legend values visible. Use Playwright’s accessibility snapshot to verify.

⸻

10) Project structure & tooling

packages/
  viewer/               # core component
    src/
      core/             # DataIngest, CoreBuffer, Controller
      renderers/        # heatmap, 2d-waterfall, 3d-waterfall, ...
      palettes/         # LUTs + loader
      ui/               # legend, HUD, grid
    index.ts
    styles.css
  examples/
    storybook/
    demo-playwright/    # deterministic frame feeder

	•	Build: tsup or Rollup; emit ESM + CJS; preserve module structure for tree-shaking.
	•	Lint/format: ESLint + Prettier.
	•	Release: semantic-release; conventional commits.
	•	Storybook: interactive showcase; used as target pages for Playwright snapshot tests.

⸻

11) Performance envelope (targets)
	•	Desktop (modern GPU):
	•	Heatmap: 1025×1400 Float32 rows ≥ 60 FPS.
	•	3D waterfall: decimated to 1025×768 ≥ 45 FPS.
	•	Mobile mid-range:
	•	Heatmap UNORM8 1025×512 ≥ 45 FPS.

⸻

12) Documentation points for the README
	•	Install, quick start, props, events, ref API.
	•	Data format (SPF1 v1) with Float32/U8 examples.
	•	Capability fallbacks (float filtering, context loss).
	•	“How to test locally” (Storybook + seeded frames, Playwright).
	•	“How to set COOP/COEP” if you use SharedArrayBuffer.  ￼ ￼

⸻

References (key, trustworthy)
	•	React Three Fiber docs & testing guidance.  ￼
	•	Three.js OrbitControls docs and usage.  ￼
	•	WebGL2 float textures & required extensions (OES_texture_float_linear, EXT_color_buffer_float).  ￼ ￼
	•	WebGL context loss events & testing (lose_context).  ￼
	•	OffscreenCanvas & transfer to worker (optional).  ￼
	•	Perceptually uniform colormaps & Turbo.  ￼ ￼
	•	Playwright visual regression (toHaveScreenshot), pixelmatch/odiff.  ￼ ￼
