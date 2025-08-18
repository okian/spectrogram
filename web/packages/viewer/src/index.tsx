import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { SpectroRingBuffer } from './core/ring-buffer';
import { Heatmap2D } from './renderers/heatmap-2d';
import { Legend } from './ui/legend';
import { 
  generateRealisticSpectrogramData, 
  generateSignalByType, 
  generateMusicSignal,
  generateMixedSignal,
  generateSTFTFrames,
  type SignalType,
  DEFAULT_CONFIG 
} from './utils/data-generator';
import type { Palette } from './palettes';

// Re-export palette utilities
export { generateLUT, samplePalette, type Palette, type PaletteName, type RGBA } from './palettes';

// Re-export data generator types
export { type SignalType } from './utils/data-generator';

/** View modes supported by the spectrogram viewer. */
export type ViewMode = '2d-heatmap' | '2d-waterfall' | '3d-waterfall' | 'polar' | 'bars' | 'ridge' | 'waveform' | 'mel' | 'chroma';

/** Magnitude scale type. */
export type Scale = 'dbfs' | 'linear';

/** Frequency axis scaling. */
export type FreqScale = 'linear' | 'log' | 'mel';

/** Stream metadata describing the incoming STFT/FFT. */
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

/** A single time-slice for one channel. */
export interface SpectroFrame {
  channelId: number;
  frameIndex: number;
  timestampUs: number;
  bins: Float32Array | Uint16Array | Uint8Array;
}

/** Declarative viewer configuration. */
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
  /** Data generation settings */
  dataType?: SignalType | 'mixed' | 'music' | 'realistic';
  dataDuration?: number;
  autoGenerate?: boolean;
}

/** Public runtime API exposed by the component. */
export interface SpectrogramAPI {
  setConfig(next: Partial<SpectroConfig>): void;
  setMeta(meta: SpectroMeta): void;
  pushFrame(frame: SpectroFrame): void;
  pushFrames(frames: SpectroFrame[]): void;
  clear(): void;
  resize(): void;
  exportPNG(opts?: { view?: ViewMode }): Promise<Blob>;
  stats(): { fps: number; dropped: number; rows: number; bins: number };
  /** Generate new data */
  generateData(type?: SignalType | 'mixed' | 'music' | 'realistic'): Promise<void>;
}

/** Props for the Spectrogram React component. */
export type SpectrogramProps = {
  config?: SpectroConfig;
  className?: string;
  style?: React.CSSProperties;
  onReady?(api: SpectrogramAPI): void;
  onHover?(p: { timeSec: number; freqHz: number; mag: number; magDb?: number; bin: number; row: number }): void;
  onClick?(p: any): void;
};

/**
 * Main Spectrogram component with integrated rendering pipeline.
 * What: Provides a complete spectrogram visualization with real-time updates.
 * Why: Combines WASM processing, GPU rendering, and interactive controls.
 */
export const Spectrogram: React.FC<SpectrogramProps> = ({ 
  config = {}, 
  className, 
  style, 
  onReady,
  onHover,
  onClick 
}) => {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const ringBufferRef = React.useRef<SpectroRingBuffer | null>(null);
  const dataIntervalRef = React.useRef<number | null>(null);
  const [currentConfig, setCurrentConfig] = React.useState<SpectroConfig>({
    view: '2d-heatmap',
    width: 800,
    height: 400,
    timeWindowSec: 10,
    palette: 'viridis',
    dbFloor: -100,
    dbCeiling: 0,
    showLegend: true,
    showGrid: true,
    background: '#111',
    dataType: 'realistic',
    dataDuration: 30,
    autoGenerate: true,
    ...config
  });

  // Initialize ring buffer when config changes
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current.querySelector('canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const maxRows = currentConfig.maxRows ?? 512;
    const binCount = 1025; // Default FFT bins

    ringBufferRef.current = new SpectroRingBuffer(gl, {
      binCount,
      maxRows,
      format: 'R32F',
      linearFilter: true
    });

    return () => {
      ringBufferRef.current?.dispose();
    };
  }, [currentConfig.maxRows]);



  const apiRef = React.useRef<SpectrogramAPI>({
    setConfig(next) {
      setCurrentConfig(prev => ({ ...prev, ...next }));
    },
    setMeta(_) {
      // TODO: Update ring buffer configuration based on meta
    },
    pushFrame(frame) {
      ringBufferRef.current?.pushRow(frame.bins);
    },
    pushFrames(frames) {
      frames.forEach(frame => {
        ringBufferRef.current?.pushRow(frame.bins);
      });
    },
    clear() {
      ringBufferRef.current?.clear();
    },
    resize() {
      // TODO: Handle resize
    },
    async exportPNG() {
      const canvas = canvasRef.current?.querySelector('canvas');
      if (!canvas) throw new Error('No canvas');
      const blob: Blob = await new Promise((resolve) => 
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
      );
      return blob;
    },
    stats() {
      const stats = ringBufferRef.current?.getStats();
      return {
        fps: 60,
        dropped: 0,
        rows: stats?.rowCount ?? 0,
        bins: stats?.binCount ?? 0
      };
    },
    generateData: async (type) => {
      if (!ringBufferRef.current) return;

      const dataType = type || currentConfig.dataType || 'realistic';
      const duration = currentConfig.dataDuration ?? 30;
      
      try {
        let frames: Array<{ bins: Float32Array; timestamp: number }> = [];
        
        if (dataType === 'realistic') {
          // Generate varied realistic data
          const realisticFrames = await generateRealisticSpectrogramData(
            DEFAULT_CONFIG,
            duration,
            ['music', 'speech', 'noise', 'chirp', 'tones']
          );
          frames = realisticFrames.map(f => ({ bins: f.bins, timestamp: f.timestamp }));
        } else if (dataType === 'music') {
          // Generate music signal
          const musicSignal = generateMusicSignal(duration * DEFAULT_CONFIG.sampleRate, DEFAULT_CONFIG.sampleRate);
          frames = await generateSTFTFrames(musicSignal, DEFAULT_CONFIG, Math.floor(duration * 10));
        } else if (dataType === 'mixed') {
          // Generate mixed signal
          const mixedSignal = generateMixedSignal(
            duration * DEFAULT_CONFIG.sampleRate,
            DEFAULT_CONFIG.sampleRate,
            [
              { type: 'music', amplitude: 0.6 },
              { type: 'speech', amplitude: 0.4 },
              { type: 'noise', amplitude: 0.2 }
            ]
          );
          frames = await generateSTFTFrames(mixedSignal, DEFAULT_CONFIG, Math.floor(duration * 10));
        } else {
          // Generate single signal type
          const signal = generateSignalByType(
            duration * DEFAULT_CONFIG.sampleRate,
            DEFAULT_CONFIG.sampleRate,
            dataType as SignalType
          );
          frames = await generateSTFTFrames(signal, DEFAULT_CONFIG, Math.floor(duration * 10));
        }
        
        // Push frames to ring buffer
        frames.forEach(frame => {
          ringBufferRef.current?.pushRow(frame.bins);
        });
        
        console.log(`Generated ${frames.length} frames of ${dataType} data`);
      } catch (error) {
        console.error('Failed to generate data:', error);
      }
    }
  });

  // Auto-generate data periodically
  React.useEffect(() => {
    if (!currentConfig.autoGenerate) {
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
      }
      return;
    }

    // Generate initial data
    apiRef.current.generateData();

    // Set up periodic generation
    dataIntervalRef.current = setInterval(() => {
      apiRef.current.generateData();
    }, (currentConfig.dataDuration ?? 30) * 1000);

    return () => {
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
      }
    };
  }, [currentConfig.autoGenerate, currentConfig.dataDuration]);

  React.useEffect(() => {
    if (onReady) onReady(apiRef.current);
  }, [onReady]);

  const { width = 800, height = 400, background = '#111' } = currentConfig;

  return (
    <div 
      ref={canvasRef}
      className={className} 
      style={{ 
        width, 
        height, 
        background, 
        position: 'relative',
        ...style 
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        {ringBufferRef.current && (
          <Heatmap2D
            ringBuffer={ringBufferRef.current}
            palette={currentConfig.palette ?? 'viridis'}
            paletteReverse={currentConfig.paletteReverse}
            dbFloor={currentConfig.dbFloor ?? -100}
            dbCeiling={currentConfig.dbCeiling ?? 0}
            showGrid={currentConfig.showGrid}
            background={currentConfig.background}
          />
        )}
      </Canvas>

      {/* Legend overlay */}
      {currentConfig.showLegend && (
        <div style={{
          position: 'absolute',
          right: 10,
          top: 10,
          zIndex: 10
        }}>
          <Legend
            palette={currentConfig.palette ?? 'viridis'}
            paletteReverse={currentConfig.paletteReverse}
            dbFloor={currentConfig.dbFloor ?? -100}
            dbCeiling={currentConfig.dbCeiling ?? 0}
            width={30}
            height={200}
          />
        </div>
      )}
    </div>
  );
};

export default Spectrogram;


