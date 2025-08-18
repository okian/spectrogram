import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

/** Metadata describing the audio stream. */
export interface SpectroMeta {
  /** Sample rate of the audio in Hz. */
  sampleRate: number;
}

/** A single frame of spectral data. */
export interface SpectroFrame {
  /** Time position of the frame in seconds. */
  time: number;
  /** Spectral values for the frame. */
  data: Float32Array;
}

/** Configuration options for the spectrogram. */
export interface SpectroConfig {
  /** Size of the FFT window. */
  fftSize: number;
}

/** Imperative API exposed by the Spectrogram component. */
export interface SpectrogramAPI {
  /** Update the component's configuration. */
  setConfig: (config: Partial<SpectroConfig>) => void;
  /** Provide metadata for the current stream. */
  setMeta: (meta: SpectroMeta) => void;
  /** Add a single frame to the spectrogram. */
  pushFrame: (frame: SpectroFrame) => void;
  /** Add multiple frames to the spectrogram. */
  pushFrames: (frames: SpectroFrame[]) => void;
  /** Clear all frames from the spectrogram. */
  clear: () => void;
}

/** Props accepted by the Spectrogram component. */
export interface SpectrogramProps {
  /** Initial configuration for the spectrogram. */
  config: SpectroConfig;
  /** Callback fired when the component's API is ready. */
  onReady?: (api: SpectrogramAPI) => void;
}

/**
 * Minimal spectrogram component. It stores incoming frames in state and exposes
 * an imperative API for external control.
 */
export const Spectrogram = forwardRef<SpectrogramAPI, SpectrogramProps>(
  function Spectrogram({ config, onReady }, ref) {
    const [currentConfig, setCurrentConfig] = useState(config);
    const [frames, setFrames] = useState<SpectroFrame[]>([]);

    const api: SpectrogramAPI = {
      setConfig: (cfg) => {
        setCurrentConfig((prev) => ({ ...prev, ...cfg }));
      },
      setMeta: () => {},
      pushFrame: (frame: SpectroFrame) => {
        setFrames((prev) => [...prev, frame]);
      },
      pushFrames: (newFrames: SpectroFrame[]) => {
        setFrames((prev) => [...prev, ...newFrames]);
      },
      clear: () => {
        setFrames([]);
      },
    };

    useImperativeHandle(ref, () => api, [api]);

    useEffect(() => {
      onReady?.(api);
    }, [api, onReady]);

    useEffect(() => {
      void frames.length;
    }, [frames]);

    useEffect(() => {
      void currentConfig;
    }, [currentConfig]);

    return null;
  },
);
