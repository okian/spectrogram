/**
 * Palette demonstration page.
 * What: Shows all available color palettes with examples.
 * Why: Helps users understand the different color mapping options.
 */

import * as React from 'react';
import { generateLUT, type PaletteName } from '@spectro/viewer';

const PALETTE_NAMES: PaletteName[] = [
  'viridis', 'magma', 'inferno', 'plasma', 'cividis', 'coolwarm', 'twilight', 'turbo'
];

/**
 * Palette preview component.
 * What: Renders a color gradient for a specific palette.
 * Why: Visual demonstration of color mapping.
 */
const PalettePreview: React.FC<{ name: PaletteName }> = ({ name }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 50;

    const lut = generateLUT(name);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);

    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const r = lut[i * 4] / 255;
      const g = lut[i * 4 + 1] / 255;
      const b = lut[i * 4 + 2] / 255;
      
      gradient.addColorStop(t, `rgb(${r * 255}, ${g * 255}, ${b * 255})`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [name]);

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 8, textTransform: 'capitalize' }}>{name}</h3>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          border: '1px solid #333',
          borderRadius: 4
        }}
      />
      <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        {name === 'viridis' && 'Perceptually uniform, good for colorblind users'}
        {name === 'magma' && 'Perceptually uniform, good for printing'}
        {name === 'inferno' && 'Perceptually uniform, high contrast'}
        {name === 'plasma' && 'Perceptually uniform, good for screens'}
        {name === 'cividis' && 'Perceptually uniform, colorblind-friendly'}
        {name === 'coolwarm' && 'Diverging palette, good for centered data'}
        {name === 'twilight' && 'Cyclic palette, good for phase data'}
        {name === 'turbo' && 'High contrast, not perceptually uniform'}
      </p>
    </div>
  );
};

/**
 * Palette demonstration page.
 * What: Shows all available color palettes with descriptions.
 * Why: Helps users choose appropriate color maps for their data.
 */
export const PaletteDemo: React.FC = () => {
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Color Palette Demonstration</h1>
      <p>
        This page demonstrates all available color palettes for spectrogram visualization. 
        Each palette is designed for specific use cases and data types.
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 20,
        marginTop: 20
      }}>
        {PALETTE_NAMES.map(name => (
          <PalettePreview key={name} name={name} />
        ))}
      </div>

      <div style={{ marginTop: 30, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
        <h2>Palette Selection Guidelines</h2>
        <ul>
          <li><strong>Viridis:</strong> Default choice, works well for most data</li>
          <li><strong>Magma/Inferno/Plasma:</strong> Good for sequential data, high contrast</li>
          <li><strong>Cividis:</strong> Colorblind-friendly alternative to viridis</li>
          <li><strong>Coolwarm:</strong> Use for data with a meaningful center point</li>
          <li><strong>Twilight:</strong> Use for cyclic data like phase information</li>
          <li><strong>Turbo:</strong> High contrast but not perceptually uniform</li>
        </ul>
      </div>
    </div>
  );
};
