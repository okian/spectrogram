/**
 * Legend component for spectrogram color scale.
 * What: Displays color gradient with dB value annotations.
 * Why: Helps users interpret the color mapping of spectrogram data.
 */

import * as React from 'react';
import { generateLUT, type Palette } from '../palettes';

/** Number of entries in a color lookup table. */
const LUT_SIZE = 256;
/** Number of bytes per RGBA color. */
const BYTES_PER_COLOR = 4;
/** Fully opaque alpha channel value. */
const FULL_ALPHA = 255;
/** Length in pixels of tick marks on the legend. */
const TICK_LENGTH = 5;
/** Count of dB labels displayed alongside the legend. */
const LABEL_COUNT = 5;
/** Width in pixels of the offscreen canvas used for gradient generation. */
const OFFSCREEN_WIDTH = 1;
/** Stroke width for borders and tick marks. */
const STROKE_WIDTH = 1;
/** Color used for legend border lines. */
const BORDER_COLOR = '#666';
/** Color used for tick marks and text. */
const FOREGROUND_COLOR = '#fff';
/** Font definition for legend labels. */
const LABEL_FONT = '12px monospace';
/** Horizontal gap between tick marks and labels. */
const LABEL_SPACING = 3;
/** Vertical offset to center labels on tick marks. */
const LABEL_VERTICAL_OFFSET = 4;
/** CSS border style applied to the canvas element. */
const CANVAS_BORDER_STYLE = '1px solid #333';
/** Default width of the legend in pixels. */
const DEFAULT_WIDTH = 30;
/** Default height of the legend in pixels. */
const DEFAULT_HEIGHT = 200;

/** Expected byte length of a full LUT. */
const EXPECTED_LUT_BYTES = LUT_SIZE * BYTES_PER_COLOR;

/**
 * Build legend ImageData from a LUT.
 * What: Generates vertical gradient pixel data using raw LUT bytes.
 * Why: Avoids costly gradient color stops and preserves color fidelity.
 * How: Copies LUT values into a 1x256 ImageData object, optionally reversing order.
 */
export function buildLegendImageData(lut: Uint8Array, reverse: boolean): ImageData {
  if (lut.length !== EXPECTED_LUT_BYTES) {
    throw new Error('Unexpected LUT byte length');
  }

  const imageData = new ImageData(1, LUT_SIZE);
  const dest = imageData.data;

  for (let i = 0; i < LUT_SIZE; i++) {
    const y = LUT_SIZE - 1 - i;
    const colorIndex = reverse ? LUT_SIZE - 1 - i : i;
    const srcOffset = colorIndex * BYTES_PER_COLOR;
    const destOffset = y * BYTES_PER_COLOR;
    dest[destOffset] = lut[srcOffset];
    dest[destOffset + 1] = lut[srcOffset + 1];
    dest[destOffset + 2] = lut[srcOffset + 2];
    dest[destOffset + 3] = FULL_ALPHA;
  }

  return imageData;
}

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
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Draw legend on canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (width <= 0 || height <= 0) {
      throw new Error('Legend dimensions must be positive');
    }
    if (dbCeiling <= dbFloor) {
      throw new Error('dbCeiling must exceed dbFloor');
    }

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Generate color LUT
    const lut = generateLUT(palette);
    const offscreen = document.createElement('canvas');
    offscreen.width = OFFSCREEN_WIDTH;
    offscreen.height = LUT_SIZE;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imageData = buildLegendImageData(lut, paletteReverse);
    offCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      offscreen,
      0,
      0,
      OFFSCREEN_WIDTH,
      LUT_SIZE,
      0,
      0,
      width,
      height
    );

    // Add border
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.strokeRect(0, 0, width, height);

    // Add dB labels
    ctx.fillStyle = FOREGROUND_COLOR;
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'left';

    for (let i = 0; i <= LABEL_COUNT; i++) {
      const t = i / LABEL_COUNT;
      const db = dbFloor + (dbCeiling - dbFloor) * t;
      const y = height - t * height;

      // Draw tick mark
      ctx.strokeStyle = FOREGROUND_COLOR;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(width, y);
      ctx.lineTo(width + TICK_LENGTH, y);
      ctx.stroke();

      // Draw label
      ctx.fillText(
        `${db.toFixed(0)} dB`,
        width + TICK_LENGTH + LABEL_SPACING,
        y + LABEL_VERTICAL_OFFSET
      );
    }
  }, [palette, paletteReverse, dbFloor, dbCeiling, width, height]);

  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          border: CANVAS_BORDER_STYLE
        }}
      />
    </div>
  );
};
