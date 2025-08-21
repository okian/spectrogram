import React, { useState, useRef, useEffect } from 'react';
import { Spectrogram, type SpectroConfig, type SpectrogramAPI, DEFAULT_BG } from '@spectro/viewer';
import { PaletteDemo } from './palette-demo';
import { WasmTest } from './wasm-test';
import type { SignalType } from '@spectro/viewer';

const signalTypes: Array<{ value: SignalType | 'mixed' | 'music' | 'realistic'; label: string; description: string }> = [
  { value: 'realistic', label: 'Realistic', description: 'Varied signals: music, speech, noise, chirp, tones' },
  { value: 'music', label: 'Music', description: 'Chord progressions with harmonics' },
  { value: 'mixed', label: 'Mixed', description: 'Music + speech + noise combined' },
  { value: 'speech', label: 'Speech', description: 'Formant-based speech simulation' },
  { value: 'noise', label: 'Noise', description: 'Broadband noise with spectral shaping' },
  { value: 'chirp', label: 'Chirp', description: 'Frequency sweep from low to high' },
  { value: 'tones', label: 'Tones', description: 'Pure musical tones (A4, C#5, E5, etc.)' },
  { value: 'drums', label: 'Drums', description: 'Rhythmic percussion patterns' },
  { value: 'ambient', label: 'Ambient', description: 'Low-frequency ambient sounds' },
  { value: 'electronic', label: 'Electronic', description: 'Synthesized electronic sounds' }
];

export const PlaygroundApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'spectrogram' | 'palettes'>('spectrogram');
    /**
     * Initial viewer configuration.
     * What: Establishes baseline rendering parameters including {@link DEFAULT_BG}.
     * Why: Provides predictable defaults for the playground UI.
     * How: Stored in React state to allow user interaction to mutate settings.
     */
    const [config, setConfig] = useState<SpectroConfig>({
      view: '2d-heatmap',
      width: 800,
      height: 400,
      timeWindowSec: 10,
      palette: 'viridis',
      dbFloor: -100,
      dbCeiling: 0,
      showLegend: true,
      showGrid: true,
      background: DEFAULT_BG,
      dataType: 'realistic',
      dataDuration: 30,
      autoGenerate: true,
      maxRows: 1000
    });
  const [stats, setStats] = useState({ fps: 0, dropped: 0, rows: 0, bins: 0 });
  const apiRef = useRef<SpectrogramAPI | null>(null);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (apiRef.current) {
        setStats(apiRef.current.stats());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReady = (api: SpectrogramAPI) => {
    apiRef.current = api;
  };

  const handleClearData = () => {
    apiRef.current?.clear();
  };

  const handleExportPNG = async () => {
    try {
      const blob = await apiRef.current?.exportPNG();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'spectrogram.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleGenerateData = async (type?: SignalType | 'mixed' | 'music' | 'realistic') => {
    await apiRef.current?.generateData(type);
  };

  /**
   * Handle hover events emitted from the spectrogram.
   * What: Provides an extension point for future UI interactions.
   * Why: Keeps the playground silent in production yet ready for instrumentation.
   * How: Memoized no-op to avoid re-renders and overhead.
   */
  const handleHover = React.useCallback((): void => {}, []);

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      padding: '20px',
      background: '#1a1a1a',
      color: '#fff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '20px'
      }}>
        <h1 style={{ margin: 0, color: '#00ff88' }}>🎵 Spectrogram Playground</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setCurrentPage('spectrogram')}
            style={{
              padding: '8px 16px',
              background: currentPage === 'spectrogram' ? '#00ff88' : '#333',
              color: currentPage === 'spectrogram' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Spectrogram Demo
          </button>
          <button
            onClick={() => setCurrentPage('palettes')}
            style={{
              padding: '8px 16px',
              background: currentPage === 'palettes' ? '#00ff88' : '#333',
              color: currentPage === 'palettes' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Color Palettes
          </button>
        </div>
      </div>

      {currentPage === 'spectrogram' ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Controls Panel */}
          <div style={{ 
            width: '300px', 
            background: '#2a2a2a', 
            padding: '20px', 
            borderRadius: '8px',
            height: 'fit-content'
          }}>
            <h3 style={{ marginTop: 0, color: '#00ff88' }}>🎛️ Controls</h3>
            
            {/* WASM Test Section */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#333', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>🔧 WASM Test</h4>
              <WasmTest />
            </div>

            {/* Data Generation Controls */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#333', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>🎵 Data Generation</h4>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Signal Type:
                </label>
                <select
                  value={config.dataType ?? 'realistic'}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    dataType: e.target.value as SignalType | 'mixed' | 'music' | 'realistic' 
                  }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#444',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px'
                  }}
                >
                  {signalTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#aaa', 
                  marginTop: '5px',
                  fontStyle: 'italic'
                }}>
                  {signalTypes.find(t => t.value === config.dataType)?.description}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Duration: {config.dataDuration}s
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={config.dataDuration ?? 30}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    dataDuration: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.autoGenerate}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      autoGenerate: e.target.checked 
                    }))}
                  />
                  Auto-generate data
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleGenerateData()}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#00ff88',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Generate Now
                </button>
                <button
                  onClick={handleClearData}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#ff4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Layout Controls */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#333', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>📐 Layout</h4>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Width: {config.width}px
                </label>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="50"
                  value={config.width ?? 800}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    width: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Height: {config.height}px
                </label>
                <input
                  type="range"
                  min="200"
                  max="600"
                  step="50"
                  value={config.height ?? 400}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    height: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Background:
                </label>
                <input
                  type="color"
                  value={config.background ?? DEFAULT_BG}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    background: e.target.value
                  }))}
                  style={{ width: '100%', height: '40px' }}
                />
              </div>
            </div>

            {/* Visualization Controls */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#333', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>🎨 Visualization</h4>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Color Palette:
                </label>
                <select
                  value={typeof config.palette === 'string' ? config.palette : 'viridis'}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    palette: e.target.value as any 
                  }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#444',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px'
                  }}
                >
                  <option value="viridis">Viridis</option>
                  <option value="magma">Magma</option>
                  <option value="inferno">Inferno</option>
                  <option value="plasma">Plasma</option>
                  <option value="cividis">Cividis</option>
                  <option value="coolwarm">Coolwarm</option>
                  <option value="twilight">Twilight</option>
                  <option value="turbo">Turbo</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  dB Floor: {config.dbFloor} dB
                </label>
                <input
                  type="range"
                  min="-120"
                  max="-60"
                  value={config.dbFloor ?? -100}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    dbFloor: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  dB Ceiling: {config.dbCeiling} dB
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={config.dbCeiling ?? 0}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    dbCeiling: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.paletteReverse}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      paletteReverse: e.target.checked 
                    }))}
                  />
                  Reverse palette
                </label>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.showLegend}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      showLegend: e.target.checked 
                    }))}
                  />
                  Show legend
                </label>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={config.showGrid}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      showGrid: e.target.checked 
                    }))}
                  />
                  Show grid
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '15px', background: '#333', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>⚡ Actions</h4>
              <button
                onClick={handleExportPNG}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0088ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
              >
                📷 Export PNG
              </button>
            </div>

            {/* Stats */}
            <div style={{ marginTop: '20px', padding: '15px', background: '#333', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffaa00' }}>📊 Stats</h4>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                <div>FPS: {stats.fps}</div>
                <div>Dropped: {stats.dropped}</div>
                <div>Rows: {stats.rows}</div>
                <div>Bins: {stats.bins}</div>
              </div>
            </div>
          </div>

          {/* Spectrogram Display */}
          <div style={{ flex: 1 }}>
            <Spectrogram
              config={config}
              onReady={handleReady}
              onHover={handleHover}
              style={{ borderRadius: '8px', overflow: 'hidden' }}
            />
          </div>
        </div>
      ) : (
        <PaletteDemo />
      )}
    </div>
  );
};


