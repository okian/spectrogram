/**
 * Legend component for spectrogram color scale.
 * What: Displays color gradient with dB value annotations.
 * Why: Helps users interpret the color mapping of spectrogram data.
 */

import * as React from 'react';
import { generateLUT, type Palette } from '../palettes';

/** Default legend width in pixels. */
const DEFAULT_WIDTH_PX = 30;
/** Default legend height in pixels. */
const DEFAULT_HEIGHT_PX = 200;
/** Number of entries in the color lookup table. */
const LUT_ENTRIES = 256;
/** Number of color components (RGBA) per lookup table entry. */
const COLOR_COMPONENTS = 4;
/** Number of dB labels displayed along the legend. */
const LABEL_COUNT = 5;
/** Length of tick marks in pixels. */
const TICK_LENGTH_PX = 5;
/** Horizontal offset for dB label text in pixels. */
const LABEL_X_OFFSET_PX = 8;
/** Vertical offset for dB label text in pixels. */
const LABEL_Y_OFFSET_PX = 4;
/** Font specification for dB labels. */
const LABEL_FONT = '12px monospace';
/** Stroke color for legend border and tick marks. */
const STROKE_COLOR = '#666';
/** Fill color for dB label text. */
const LABEL_COLOR = '#fff';
/** Width of lines used for borders and ticks in pixels. */
const LINE_WIDTH_PX = 1;
/** Maximum value for an 8-bit color channel. */
const COLOR_MAX = 255;

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
  width = DEFAULT_WIDTH_PX,
  height = DEFAULT_HEIGHT_PX,
  className
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Draw legend on canvas
  React.useEffect(() => {
    // Validate dB range to avoid inverted or zero-span legends
    if (dbCeiling <= dbFloor) {
      throw new RangeError(
        `Legend requires dbCeiling (${dbCeiling}) to be greater than dbFloor (${dbFloor}).`
      );
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Generate color LUT
    const lut = generateLUT(palette, LUT_ENTRIES);
    const gradient = ctx.createLinearGradient(0, height, 0, 0);

    // Create gradient stops
    for (let i = 0; i < LUT_ENTRIES; i++) {
      const t = i / (LUT_ENTRIES - 1);
      const colorIndex = paletteReverse ? LUT_ENTRIES - 1 - i : i;
      const r = lut[colorIndex * COLOR_COMPONENTS] / COLOR_MAX;
      const g = lut[colorIndex * COLOR_COMPONENTS + 1] / COLOR_MAX;
      const b = lut[colorIndex * COLOR_COMPONENTS + 2] / COLOR_MAX;

      gradient.addColorStop(
        t,
        `rgb(${r * COLOR_MAX}, ${g * COLOR_MAX}, ${b * COLOR_MAX})`
      );
    }

    // Fill gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add border
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = LINE_WIDTH_PX;
    ctx.strokeRect(0, 0, width, height);

    // Add dB labels
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'left';

    for (let i = 0; i <= LABEL_COUNT; i++) {
      const t = i / LABEL_COUNT;
      const db = dbFloor + (dbCeiling - dbFloor) * t;
      const y = height - t * height;

      // Draw tick mark
      ctx.strokeStyle = LABEL_COLOR;
      ctx.lineWidth = LINE_WIDTH_PX;
      ctx.beginPath();
      ctx.moveTo(width, y);
      ctx.lineTo(width + TICK_LENGTH_PX, y);
      ctx.stroke();

      // Draw label
      ctx.fillText(
        `${db.toFixed(0)} dB`,
        width + LABEL_X_OFFSET_PX,
        y + LABEL_Y_OFFSET_PX
      );
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
