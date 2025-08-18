/** Type definitions for spectrogram viewer */

/** Supported view modes for rendering */
export type ViewMode =
  | '2d-heatmap'
  | '2d-waterfall'
  | '3d-waterfall'
  | 'polar'
  | 'bars'
  | 'ridge'
  | 'waveform'
  | 'mel'
  | 'chroma';

/** Scale used for incoming magnitudes */
export type Scale = 'dbfs' | 'linear';

/** Frequency scale representation */
export type FreqScale = 'linear' | 'log' | 'mel';

/** Named palettes bundled with the viewer */
export type PaletteName =
  | 'viridis'
  | 'magma'
  | 'inferno'
  | 'plasma'
  | 'cividis'
  | 'coolwarm'
  | 'twilight'
  | 'turbo';

/** Palette description or name */
export type Palette =
  | PaletteName
  | { name: string; lut: Uint8Array | number[] };

/** Metadata for a streaming spectrogram source */
export interface SpectroMeta {
  /** Unique stream identifier */
  streamId: string;
  /** Number of channels in the stream */
  channels: number;
  /** Source sample rate in hertz */
  sampleRateHz: number;
  /** FFT size used to generate frames */
  nfft: number;
  /** Hop size between frames in samples */
  hopSize: number;
  /** Number of frequency bins */
  binCount: number;
  /** Frequency of the first bin */
  freqStartHz: number;
  /** Frequency increment per bin */
  freqStepHz: number;
  /** Magnitude scale of incoming data */
  scale: Scale;
  /** Frequency scaling for display */
  freqScale?: FreqScale;
  /** Window function applied during FFT */
  window?: 'hann' | 'hamming' | 'blackman' | 'kaiser' | 'other';
}

/** A single frame of spectral data for one channel */
export interface SpectroFrame {
  /** Channel identifier for the frame */
  channelId: number;
  /** Monotonic frame index */
  frameIndex: number;
  /** Optional timestamp in microseconds */
  timestampUs: number;
  /** Magnitude bins for the frame */
  bins: Float32Array | Uint16Array | Uint8Array;
}

/** Declarative configuration options for the viewer */
export interface SpectroConfig {
  /** Rendering mode */
  view?: ViewMode;
  /** Explicit canvas width in pixels */
  width?: number;
  /** Explicit canvas height in pixels */
  height?: number;
  /** Duration of time window in seconds */
  timeWindowSec?: number;
  /** Frequency scale override */
  freqScale?: FreqScale;
  /** Minimum decibel value */
  dbFloor?: number;
  /** Maximum decibel value */
  dbCeiling?: number;
  /** Color palette to use */
  palette?: Palette;
  /** Reverse palette order */
  paletteReverse?: boolean;
  /** Background color */
  background?: string;
  /** Z-axis scale for 3D modes */
  heightScale?: number;
  /** Render mesh as wireframe */
  wireframe3D?: boolean;
  /** Show legend overlay */
  showLegend?: boolean;
  /** Draw grid overlay */
  showGrid?: boolean;
  /** Enable cursor readout */
  showCursorReadout?: boolean;
  /** Enable orbit controls */
  orbitControls?: boolean;
  /** Maximum number of time rows */
  maxRows?: number;
  /** Downsample ratio for time axis */
  downsampleTime?: number;
  /** Downsample ratio for frequency axis */
  downsampleFreq?: number;
  /** Band layout for bar view */
  barBands?: 'octave' | 'third' | 'mel' | number;
  /** Theme name */
  theme?: 'light' | 'dark';
}

/** Public API exposed via component ref */
export interface SpectrogramAPI {
  /** Merge new configuration options */
  setConfig(next: Partial<SpectroConfig>): void;
  /** Update stream metadata */
  setMeta(meta: SpectroMeta): void;
  /** Push a single frame into the buffer */
  pushFrame(frame: SpectroFrame): void;
  /** Push multiple frames into the buffer */
  pushFrames(frames: SpectroFrame[]): void;
  /** Clear all buffered frames */
  clear(): void;
  /** Recompute layout for container resize */
  resize(): void;
  /** Export current view as PNG */
  exportPNG(opts?: { view?: ViewMode }): Promise<Blob>;
  /** Retrieve runtime statistics */
  stats(): { fps: number; dropped: number; rows: number; bins: number };
}

/** Properties for the Spectrogram React component */
export interface SpectrogramProps {
  /** Initial viewer configuration */
  config?: SpectroConfig;
  /** Optional class name for container */
  className?: string;
  /** Optional inline styles for container */
  style?: React.CSSProperties;
  /** Called when the component is ready */
  onReady?(api: SpectrogramAPI): void;
  /** Mouse hover event callback */
  onHover?(p: {
    timeSec: number;
    freqHz: number;
    mag: number;
    magDb?: number;
    bin: number;
    row: number;
  }): void;
  /** Mouse click event callback */
  onClick?(same: unknown): void;
}
