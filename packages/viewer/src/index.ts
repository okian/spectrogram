import React, {
  CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

// re-export submodules
export * from './renderers';
export * from './palettes';
export * from './demoData';

// core classes (loaded after type definitions in CJS)
import { DataIngest, Controller } from './core';

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
  streamId: string;
  channels: number;
  sampleRateHz: number;
  nfft: number;
  hopSize: number;
  binCount: number;
  freqStartHz: number;
  freqStepHz: number;
  scale: Scale;
  freqScale?: FreqScale;
  window?: 'hann' | 'hamming' | 'blackman' | 'kaiser' | 'other';
}

/** A single time slice for one channel. */
export interface SpectroFrame {
  channelId: number;
  frameIndex: number;
  timestampUs: number;
  bins: Float32Array | Uint16Array | Uint8Array;
}

/** Declarative configuration for the viewer. */
export interface SpectroConfig {
  view?: ViewMode;
  width?: number;
  height?: number;
  timeWindowSec?: number;
  freqScale?: FreqScale;
  dbFloor?: number;
  dbCeiling?: number;
  palette?: Palette;
  paletteReverse?: boolean;
  background?: string;
  heightScale?: number;
  wireframe3D?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showCursorReadout?: boolean;
  orbitControls?: boolean;
  maxRows?: number;
  downsampleTime?: number;
  downsampleFreq?: number;
  barBands?: 'octave' | 'third' | 'mel' | number;
  theme?: 'light' | 'dark';
}

/** Default metadata values when none are supplied. */
export const DEFAULT_SPECTRO_META: SpectroMeta = {
  streamId: 'default',
  channels: 1,
  sampleRateHz: 48_000,
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

/** Public methods exposed via ref. */
export interface SpectrogramAPI {
  setConfig(next: Partial<SpectroConfig>): void;
  setMeta(meta: SpectroMeta): void;
  pushFrame(frame: SpectroFrame): void;
  pushFrames(frames: SpectroFrame[]): void;
  clear(): void;
  resize(width: number, height: number): void;
  exportPNG(opts?: { view?: SpectroConfig['view'] }): Promise<Blob>;
  stats(): { fps: number; dropped: number; rows: number; bins: number };
}

/** Props accepted by {@link Spectrogram}. */
export interface SpectrogramProps {
  config?: SpectroConfig;
  className?: string;
  style?: CSSProperties;
  onReady?(api: SpectrogramAPI): void;
  onHover?(event: React.MouseEvent<HTMLDivElement>): void;
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
}

/** Minimal spectrogram viewer component. */
export const Spectrogram = forwardRef<SpectrogramAPI, SpectrogramProps>(
  function SpectrogramComponent(props, ref) {
    const { config, className, style, onReady, onHover, onClick } = props;
    const configRef = useRef<SpectroConfig>({
      ...DEFAULT_SPECTRO_CONFIG,
      ...(config ?? {}),
    });
    const controllerRef = useRef(new Controller(configRef.current));
    const ingestRef = useRef(new DataIngest(controllerRef.current));
    const metaRef = useRef<SpectroMeta | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [frameCount, setFrameCount] = useState(0);
    const [size, setSize] = useState<{ width?: number; height?: number }>({
      width: configRef.current.width,
      height: configRef.current.height,
    });

    const api = useMemo<SpectrogramAPI>(
      () => ({
        setConfig(next) {
          controllerRef.current.setConfig(next);
          configRef.current = { ...configRef.current, ...next };
          if (next.width !== undefined || next.height !== undefined) {
            setSize({
              width: next.width ?? configRef.current.width,
              height: next.height ?? configRef.current.height,
            });
          }
        },
        setMeta(meta) {
          metaRef.current = meta;
          ingestRef.current.setMeta(meta);
        },
        pushFrame(frame) {
          ingestRef.current.pushFrame(frame);
          setFrameCount(ingestRef.current.getStats().frameCount);
        },
        pushFrames(frames) {
          ingestRef.current.pushFrames(frames);
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
        async exportPNG() {
          const canvas = canvasRef.current;
          return new Promise<Blob>((resolve) => {
            if (!canvas || !canvas.toBlob) {
              resolve(new Blob());
              return;
            }
            canvas.toBlob((b) => resolve(b ?? new Blob()));
          });
        },
        stats() {
          return {
            fps: 0,
            dropped: 0,
            rows: ingestRef.current.getStats().frameCount,
            bins: metaRef.current?.binCount ?? 0,
          };
        },
      }),
      [],
    );

    useImperativeHandle(ref, () => api, [api]);

    useEffect(() => {
      const merged = { ...DEFAULT_SPECTRO_CONFIG, ...(config ?? {}) };
      controllerRef.current.setConfig(merged);
      configRef.current = merged;
      setSize({ width: merged.width, height: merged.height });
    }, [config]);

    useEffect(() => {
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

export default Spectrogram;
