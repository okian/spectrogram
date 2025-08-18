import React, {
  CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/** Stream metadata describing the incoming audio data. */
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
  scale: "dbfs" | "linear";
  /** Optional frequency scale. Defaults to 'linear'. */
  freqScale?: "linear" | "log" | "mel";
  /** Optional window function. */
  window?: "hann" | "hamming" | "blackman" | "kaiser" | "other";
}

/** A single time slice of spectral data. */
export interface SpectroFrame {
  /** Channel index the frame belongs to. */
  channelId: number;
  /** Monotonic frame index per channel. */
  frameIndex: number;
  /** Timestamp in microseconds. */
  timestampUs: number;
  /** Magnitude bins for the frame. */
  bins: Float32Array | Uint16Array | Uint8Array;
}

/** Declarative configuration for the viewer. */
export interface SpectroConfig {
  /** Rendering mode. */
  view?:
    | "2d-heatmap"
    | "2d-waterfall"
    | "3d-waterfall"
    | "polar"
    | "bars"
    | "ridge"
    | "waveform"
    | "mel"
    | "chroma";
  /** Width of the canvas in pixels; fills parent if omitted. */
  width?: number;
  /** Height of the canvas in pixels; defaults to 300. */
  height?: number;
  /** Visible time window in seconds. */
  timeWindowSec?: number;
  /** Frequency scale for rendering. */
  freqScale?: "linear" | "log" | "mel";
  /** Minimum decibel value. */
  dbFloor?: number;
  /** Maximum decibel value. */
  dbCeiling?: number;
  /** Color palette to use. */
  palette?:
    | "viridis"
    | "magma"
    | "inferno"
    | "plasma"
    | "cividis"
    | "coolwarm"
    | "twilight"
    | "turbo"
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
  /** Time downsampling factor. */
  downsampleTime?: number;
  /** Frequency downsampling factor. */
  downsampleFreq?: number;
  /** Band configuration for bar view. */
  barBands?: "octave" | "third" | "mel" | number;
  /** Theme of the viewer. */
  theme?: "light" | "dark";
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
  exportPNG(opts?: { view?: SpectroConfig["view"] }): Promise<Blob>;
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

    return React.createElement("div", { className, style });
  },
);

export default Spectrogram;
