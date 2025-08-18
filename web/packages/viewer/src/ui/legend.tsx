/**
 * Legend component for spectrogram color scale.
 * What: Displays color gradient with dB value annotations.
 * Why: Helps users interpret the color mapping of spectrogram data.
 */

import * as React from 'react';
import { generateLUT, type Palette } from '../palettes';

/** Props for the legend component. */
interface LegendProps {
  /** Color palette for the legend. */
  palette: Palette;
  /** Whether to reverse the palette. */
  paletteReverse?: boolean;
  /** dB range for the legend. */
  dbFloor: number;
  /** dB range for the legend. */
  dbCeiling: number;
  /** Width of the legend in pixels. */
  width?: number;
  /** Height of the legend in pixels. */
  height?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Legend component for spectrogram visualization.
 * What: Renders a color gradient with dB value annotations.
 * Why: Provides visual reference for interpreting spectrogram colors.
 */
export const Legend: React.FC<LegendProps> = ({
  palette,
  paletteReverse = false,
  dbFloor,
  dbCeiling,
  width = 30,
  height = 200,
  className
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Draw legend on canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Generate color LUT
    const lut = generateLUT(palette);
    const gradient = ctx.createLinearGradient(0, height, 0, 0);

    // Create gradient stops
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const colorIndex = paletteReverse ? 255 - i : i;
      const r = lut[colorIndex * 4] / 255;
      const g = lut[colorIndex * 4 + 1] / 255;
      const b = lut[colorIndex * 4 + 2] / 255;
      
      gradient.addColorStop(t, `rgb(${r * 255}, ${g * 255}, ${b * 255})`);
    }

    // Fill gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Add dB labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const t = i / labelCount;
      const db = dbFloor + (dbCeiling - dbFloor) * t;
      const y = height - t * height;
      
      // Draw tick mark
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width, y);
      ctx.lineTo(width + 5, y);
      ctx.stroke();
      
      // Draw label
      ctx.fillText(`${db.toFixed(0)} dB`, width + 8, y + 4);
    }
  }, [palette, paletteReverse, dbFloor, dbCeiling, width, height]);

  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          border: '1px solid #333'
        }}
      />
    </div>
  );
};
