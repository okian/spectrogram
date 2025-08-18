import React, {
  CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

/** Stream metadata describing the incoming audio data. */

import { DataIngest, Controller } from './core';
export * from './renderers';
export * from './palettes';
export * from './demoData';

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

/** Basic runtime statistics from the viewer. */
export interface SpectrogramStats {
  /** Number of buffered frames. */
  frameCount: number;
}

/** Stream metadata describing the audio stream. */
export interface SpectroMeta {
  /** Unique identifier for the stream. */
  streamId: string;
  /** Number of channels in the stream. */
  channels: number;
  /** Sample rate in hertz. */
  sampleRateHz: number;
  /** FFT size used to generate frames. */
  nfft: number;
  /** Hop size between successive frames, in samples. */
  hopSize: number;
  /** Number of frequency bins in each frame. */
  binCount: number;
  /** Starting frequency of the first bin, in hertz. */
  freqStartHz: number;
  /** Frequency step between bins, in hertz. */
  freqStepHz: number;
  /** Amplitude scale of the data. */
  scale: 'dbfs' | 'linear';
  /** Optional frequency scale. Defaults to 'linear'. */
  freqScale?: 'linear' | 'log' | 'mel';
  /** Optional window function. */
  window?: 'hann' | 'hamming' | 'blackman' | 'kaiser' | 'other';
}

/** A single time slice of spectral data. */
export interface SpectroFrame {
  /** Channel index the frame belongs to. */
  channelId: number;
  /** Monotonic frame index per channel. */
  frameIndex: number;
  /** Timestamp in microseconds. */
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
  /** Rendering mode. */
  view?:
    | '2d-heatmap'
    | '2d-waterfall'
    | '3d-waterfall'
    | 'polar'
    | 'bars'
    | 'ridge'
    | 'waveform'
    | 'mel'
    | 'chroma';
  /** Width of the canvas in pixels; fills parent if omitted. */
  width?: number;
  /** Height of the canvas in pixels; defaults to 300. */
  height?: number;
  /** Visible time window in seconds. */
  timeWindowSec?: number;
  /** Frequency scale for rendering. */
  freqScale?: 'linear' | 'log' | 'mel';
  /** Minimum decibel value. */
  dbFloor?: number;
  /** Maximum decibel value. */
  dbCeiling?: number;
  /** Color palette to use. */
  palette?:
    | 'viridis'
    | 'magma'
    | 'inferno'
    | 'plasma'
    | 'cividis'
    | 'coolwarm'
    | 'twilight'
    | 'turbo'
    | { name: string; lut: Uint8Array | number[] };
  /** Reverse the selected palette. */
  paletteReverse?: boolean;
  /** Background CSS color. */
  background?: string;
  /** Height scale for 3D rendering. */
  heightScale?: number;
  /** Render as wireframe in 3D mode. */
  wireframe3D?: boolean;
  /** Show the color legend. */
  showLegend?: boolean;
  /** Show grid lines. */
  showGrid?: boolean;
  /** Show cursor readout overlay. */
  showCursorReadout?: boolean;
  /** Enable orbit controls for navigation. */
  orbitControls?: boolean;
  /** Maximum number of rows stored on the GPU. */
  maxRows?: number;
}

/** Default metadata values when none are supplied. */
export const DEFAULT_SPECTRO_META: SpectroMeta = {
  streamId: 'default',
  channels: 1,
  sampleRateHz: 48000,
  nfft: 2048,
  hopSize: 512,
  binCount: 1025,
  freqStartHz: 0,
  freqStepHz: 1,
  scale: 'dbfs',
  window: 'hann',
};

/** Default viewer configuration. */
export const DEFAULT_SPECTRO_CONFIG: SpectroConfig = {
  timeWindowSec: 15,
  freqScale: 'log',
  dbFloor: -100,
  dbCeiling: 0,
  palette: 'viridis',
};

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
  /** Band configuration for bar view. */
  barBands?: 'octave' | 'third' | 'mel' | number;
  /** Theme of the viewer. */
  theme?: 'light' | 'dark';
}

/** Public methods exposed via ref. */
export interface SpectrogramAPI {
  /** Merge new configuration values. */
  setConfig(next: Partial<SpectroConfig>): void;
  /** Replace the current stream metadata. */
  setMeta(meta: SpectroMeta): void;
  /** Append a single frame to the buffer. */
  pushFrame(frame: SpectroFrame): void;
  /** Append multiple frames to the buffer. */
  pushFrames(frames: SpectroFrame[]): void;
  /** Remove all buffered frames. */
  clear(): void;
  /** Placeholder resize hook. */
  resize(): void;
  /** Export the current view as a PNG blob. */
  exportPNG(opts?: { view?: SpectroConfig['view'] }): Promise<Blob>;
  /** Retrieve simple runtime statistics. */
  stats(): { fps: number; dropped: number; rows: number; bins: number };
}

/** Props accepted by {@link Spectrogram}. */
export interface SpectrogramProps {
  /** Initial configuration for the viewer. */
  config?: SpectroConfig;
  /** Optional CSS class name for the root element. */
  className?: string;
  /** Optional inline styles for the root element. */
  style?: CSSProperties;
  /** Called once when the component is ready. */
  onReady?(api: SpectrogramAPI): void;
  /** Hover callback (unimplemented). */
  onHover?(p: {
    timeSec: number;
    freqHz: number;
    mag: number;
    magDb?: number;
    bin: number;
    row: number;
  }): void;
  /** Click callback (unimplemented). */
  onClick?(p: unknown): void;
}

/**
 * Minimal spectrogram component that stores frames in state
 * and exposes an imperative API via {@link SpectrogramAPI}.
 */
export const Spectrogram = forwardRef<SpectrogramAPI, SpectrogramProps>(
  ({ config, className, style, onReady }: SpectrogramProps, ref) => {
    const [, setCfg] = useState<SpectroConfig | undefined>(config);
    const [_metaState, setMetaState] = useState<SpectroMeta | undefined>(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [_framesState, setFramesState] = useState<SpectroFrame[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
    const ready = useRef(false);
    const metaRef = useRef<SpectroMeta | undefined>(undefined);
    const framesRef = useRef<SpectroFrame[]>([]);

    const apiRef = useRef<SpectrogramAPI>({
      setConfig: (next) => setCfg((prev) => ({ ...(prev || {}), ...next })),
      setMeta: (m) => {
        metaRef.current = m;
        setMetaState(m);
      },
      pushFrame: (f) => {
        framesRef.current = [...framesRef.current, f];
        setFramesState(framesRef.current);
      },
      pushFrames: (fs) => {
        framesRef.current = [...framesRef.current, ...fs];
        setFramesState(framesRef.current);
      },
      clear: () => {
        framesRef.current = [];
        setFramesState([]);
      },
      resize: () => {},
      exportPNG: async () => new Blob(),
      stats: () => ({
        fps: 0,
        dropped: 0,
        rows: framesRef.current.length,
        bins: metaRef.current?.binCount ?? 0,
      }),
    });

    useImperativeHandle(ref, () => apiRef.current, []);

    useEffect(() => {
      if (config) setCfg(config);
    }, [config]);

    useEffect(() => {
      if (!ready.current) {
        ready.current = true;
        onReady?.(apiRef.current);
      }
    }, [onReady]);

    return React.createElement('div', { className, style });
  },
);

export default Spectrogram;

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
  /** Resize the viewer to a new width and height. */
  resize(width: number, height: number): void;
  /** Export the current view as a PNG data URL. */
  toPng(): string;
  /** Retrieve runtime statistics about the viewer. */
  getStats(): SpectrogramStats;
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
  /** Fired when the pointer moves over the viewer. */
  onHover?(event: React.MouseEvent<HTMLDivElement>): void;
  /** Fired when the viewer is clicked. */
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
}

/** Minimal spectrogram viewer component. */
export const Spectrogram = React.forwardRef<SpectrogramAPI, SpectrogramProps>(
  function SpectrogramComponent(props, ref) {
    const { config, className, style, onReady, onHover, onClick } = props;
    const configRef = React.useRef<SpectroConfig>({
      ...DEFAULT_SPECTRO_CONFIG,
      ...(config ?? {}),
    });
    const controllerRef = React.useRef(new Controller(configRef.current));
    const ingestRef = React.useRef(new DataIngest(controllerRef.current));
    const metaRef = React.useRef<SpectroMeta | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [frameCount, setFrameCount] = React.useState(0);
    const [size, setSize] = React.useState<{ width?: number; height?: number }>(
      {
        width: configRef.current.width,
        height: configRef.current.height,
      },
    );

    const api = React.useMemo<SpectrogramAPI>(
      () => ({
        setConfig(next) {
          controllerRef.current.setConfig(next);
          configRef.current = { ...configRef.current, ...next };
        },
        setMeta(meta) {
          metaRef.current = meta;
          ingestRef.current.setMeta(meta);
        },
        pushFrame(frame) {
          ingestRef.current.pushFrame(frame);
          setFrameCount(ingestRef.current.getStats().frameCount);
        },
        pushFrames(frs) {
          ingestRef.current.pushFrames(frs);
          setFrameCount(ingestRef.current.getStats().frameCount);
        },
        clear() {
          ingestRef.current.clear();
          setFrameCount(ingestRef.current.getStats().frameCount);
        },
        resize(width, height) {
          controllerRef.current.setConfig({ width, height });
          configRef.current = { ...configRef.current, width, height };
          setSize({ width, height });
        },
        toPng() {
          return canvasRef.current?.toDataURL('image/png') ?? '';
        },
        getStats() {
          return ingestRef.current.getStats();
        },
      }),
      [],
    );

    React.useImperativeHandle(ref, () => api, [api]);

    React.useEffect(() => {
      const merged = { ...DEFAULT_SPECTRO_CONFIG, ...(config ?? {}) };
      controllerRef.current.setConfig(merged);
      configRef.current = merged;
      setSize({ width: merged.width, height: merged.height });
    }, [config]);

    React.useEffect(() => {
      onReady?.(api);
    }, [onReady, api]);

    return React.createElement(
      'div',
      {
        className,
        style,
        'data-frame-count': frameCount,
        'data-width': size.width,
        'data-height': size.height,
        onMouseMove: onHover,
        onClick,
      },
      React.createElement('canvas', {
        ref: canvasRef,
        style: { display: 'none' },
        width: size.width,
        height: size.height,
      }),
    );
  },
);
