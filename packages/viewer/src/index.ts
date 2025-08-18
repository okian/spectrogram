import React from 'react';

/** Return the version string of the viewer package. */
export function viewerVersion(): string {
  return '0.0.0';
}

/** All view modes supported by the spectrogram. */
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

/** Magnitude scale of incoming frames. */
export type Scale = 'dbfs' | 'linear';

/** Frequency scaling options. */
export type FreqScale = 'linear' | 'log' | 'mel';

/** Named palettes or custom lookup tables. */
export type PaletteName =
  | 'viridis'
  | 'magma'
  | 'inferno'
  | 'plasma'
  | 'cividis'
  | 'coolwarm'
  | 'twilight'
  | 'turbo';
export type Palette =
  | PaletteName
  | { name: string; lut: Uint8Array | number[] };

/** Stream metadata describing the audio stream. */
export interface SpectroMeta {
  /** Unique identifier for the stream. */
  streamId: string;
  /** Number of channels in the stream. */
  channels: number;
  /** Sample rate in hertz. */
  sampleRateHz: number;
  /** FFT size used for analysis. */
  nfft: number;
  /** Hop size between frames in samples. */
  hopSize: number;
  /** Number of frequency bins per frame. */
  binCount: number;
  /** Starting frequency of the first bin in hertz. */
  freqStartHz: number;
  /** Step in hertz between successive bins. */
  freqStepHz: number;
  /** Magnitude scale of the data. */
  scale: Scale;
  /** Frequency scale used in metadata. */
  freqScale?: FreqScale;
  /** Window function applied during analysis. */
  window?: 'hann' | 'hamming' | 'blackman' | 'kaiser' | 'other';
}

/** A single time slice for one channel. */
export interface SpectroFrame {
  /** Channel index for the frame. */
  channelId: number;
  /** Monotonic frame index per channel. */
  frameIndex: number;
  /** Optional timestamp in microseconds. */
  timestampUs: number;
  /** Magnitude bins for the frame. */
  bins: Float32Array | Uint16Array | Uint8Array;
}

/** Declarative configuration for the viewer. */
export interface SpectroConfig {
  /** Rendering mode of the viewer. */
  view?: ViewMode;
  /** Explicit width of the canvas in pixels. */
  width?: number;
  /** Explicit height of the canvas in pixels. */
  height?: number;
  /** Length of the time window in seconds. */
  timeWindowSec?: number;
  /** Frequency scaling mode. */
  freqScale?: FreqScale;
  /** Minimum decibel floor. */
  dbFloor?: number;
  /** Maximum decibel ceiling. */
  dbCeiling?: number;
  /** Palette used for rendering. */
  palette?: Palette;
  /** Whether to reverse palette colors. */
  paletteReverse?: boolean;
  /** Background color. */
  background?: string;
  /** Height scale used for 3D modes. */
  heightScale?: number;
  /** Render in wireframe for 3D mode. */
  wireframe3D?: boolean;
  /** Show legend overlay. */
  showLegend?: boolean;
  /** Show grid overlay. */
  showGrid?: boolean;
  /** Show cursor readout. */
  showCursorReadout?: boolean;
  /** Enable orbit controls. */
  orbitControls?: boolean;
  /** Maximum rows retained. */
  maxRows?: number;
  /** Time downsampling factor. */
  downsampleTime?: number;
  /** Frequency downsampling factor. */
  downsampleFreq?: number;
  /** Bands for bar visualisations. */
  barBands?: 'octave' | 'third' | 'mel' | number;
  /** Theme selection. */
  theme?: 'light' | 'dark';
}

/** Public methods exposed by the spectrogram component. */
export interface SpectrogramAPI {
  /** Update viewer configuration at runtime. */
  setConfig(next: Partial<SpectroConfig>): void;
  /** Update metadata describing the input stream. */
  setMeta(meta: SpectroMeta): void;
  /** Append a single frame to the viewer. */
  pushFrame(frame: SpectroFrame): void;
  /** Append multiple frames to the viewer. */
  pushFrames(frames: SpectroFrame[]): void;
  /** Clear all buffered frames. */
  clear(): void;
}

/** Props accepted by the Spectrogram component. */
export interface SpectrogramProps {
  /** Initial configuration for the viewer. */
  config?: SpectroConfig;
  /** Optional CSS class for the container. */
  className?: string;
  /** Inline styles for the container. */
  style?: React.CSSProperties;
  /** Called when the component is ready and exposes its API. */
  onReady?(api: SpectrogramAPI): void;
}

/** Minimal spectrogram viewer component. */
export const Spectrogram = React.forwardRef<SpectrogramAPI, SpectrogramProps>(
  function SpectrogramComponent(props, ref) {
    const { config, className, style, onReady } = props;
    const [frames, setFrames] = React.useState<SpectroFrame[]>([]);
    const configRef = React.useRef<SpectroConfig>(config ?? {});
    const metaRef = React.useRef<SpectroMeta | null>(null);

    const api = React.useMemo<SpectrogramAPI>(
      () => ({
        setConfig(next) {
          configRef.current = { ...configRef.current, ...next };
        },
        setMeta(meta) {
          metaRef.current = meta;
        },
        pushFrame(frame) {
          setFrames((f) => [...f, frame]);
        },
        pushFrames(frs) {
          setFrames((f) => [...f, ...frs]);
        },
        clear() {
          setFrames([]);
        },
      }),
      [],
    );

    React.useImperativeHandle(ref, () => api, [api]);

    React.useEffect(() => {
      configRef.current = config ?? {};
    }, [config]);

    React.useEffect(() => {
      onReady?.(api);
    }, [onReady, api]);

    return React.createElement('div', {
      className,
      style,
      'data-frame-count': frames.length,
    });
  },
);
