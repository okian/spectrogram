import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  SpectroConfig,
  SpectroFrame,
  SpectroMeta,
  SpectrogramAPI,
  SpectrogramProps,
} from './types';

/** Minimal React component wrapping spectrogram API */
export const Spectrogram = forwardRef<SpectrogramAPI, SpectrogramProps>(
  function Spectrogram({ config, className, style, onReady, ...rest }, ref) {
    const [currentConfig, setCurrentConfig] = useState<SpectroConfig>(
      config ?? {},
    );
    const [meta, setMeta] = useState<SpectroMeta | null>(null);
    const [frames, setFrames] = useState<SpectroFrame[]>([]);

    const api: SpectrogramAPI = {
      setConfig(next) {
        setCurrentConfig((prev) => ({ ...prev, ...next }));
      },
      setMeta(nextMeta) {
        setMeta(nextMeta);
      },
      pushFrame(frame) {
        setFrames((prev) => [...prev, frame]);
      },
      pushFrames(newFrames) {
        setFrames((prev) => [...prev, ...newFrames]);
      },
      clear() {
        setFrames([]);
      },
      resize() {
        /* no-op */
      },
      exportPNG() {
        return Promise.resolve(new Blob());
      },
      stats() {
        return {
          fps: 0,
          dropped: 0,
          rows: frames.length,
          bins: meta?.binCount ?? 0,
        };
      },
    };

    useImperativeHandle(ref, () => api, [api]);

    useEffect(() => {
      onReady?.(api);
    }, [api, onReady]);

    return (
      <div
        className={className}
        style={{
          width: currentConfig.width,
          height: currentConfig.height,
          ...style,
        }}
        data-frame-count={frames.length}
        {...rest}
      />
    );
  },
);
