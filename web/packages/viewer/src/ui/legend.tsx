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
          border: CANVAS_BORDER_STYLE
        }}
      />
    </div>
  );
};
