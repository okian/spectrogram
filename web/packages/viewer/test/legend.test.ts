import { describe, it, expect } from 'vitest';
import { buildLegendImageData } from '../src/ui/legend';
import { generateLUT } from '../src/palettes';

/** Palette used for legend tests ensuring consistent colors. */
const TEST_PALETTE = 'viridis';
/** Expected LUT size matching production constant. */
const TEST_LUT_SIZE = 256;
/** Bytes per color entry in LUT and ImageData. */
const TEST_BYTES_PER_COLOR = 4;

/** Minimal ImageData polyfill for Node test environment. */
class MockImageData implements ImageData {
  /** Width in pixels of the image. */
  width: number;
  /** Height in pixels of the image. */
  height: number;
  /** Underlying pixel buffer in RGBA order. */
  data: Uint8ClampedArray;
  /** Color space hint; unused but required by interface. */
  colorSpace: PredefinedColorSpace = 'srgb';

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * TEST_BYTES_PER_COLOR);
  }
}
(globalThis as any).ImageData = MockImageData as unknown as typeof ImageData;

/**
 * Extract RGB components from a data buffer.
 * What: Reads contiguous bytes as color components.
 * Why: Simplifies assertions on pixel values.
 */
function rgbAt(data: Uint8ClampedArray | Uint8Array, index: number): number[] {
  return [data[index], data[index + 1], data[index + 2]];
}

describe('buildLegendImageData', () => {
  /**
   * Verify direct LUT byte transfer without palette reversal.
   * What: Ensures bottom and top pixels match first and last LUT entries.
   */
  it('populates ImageData directly from LUT bytes', () => {
    const lut = generateLUT(TEST_PALETTE);
    const imageData = buildLegendImageData(lut, false);
    const data = imageData.data;
    const bottomIdx = (TEST_LUT_SIZE - 1) * TEST_BYTES_PER_COLOR;
    const topIdx = 0;
    expect(rgbAt(data, bottomIdx)).toEqual(rgbAt(lut, 0));
    expect(rgbAt(data, topIdx)).toEqual(
      rgbAt(lut, (TEST_LUT_SIZE - 1) * TEST_BYTES_PER_COLOR)
    );
  });

  /**
   * Verify color reversal functionality.
   * What: Checks that flipping reverses pixel ordering.
   */
  it('reverses colors when requested', () => {
    const lut = generateLUT(TEST_PALETTE);
    const imageData = buildLegendImageData(lut, true);
    const data = imageData.data;
    const bottomIdx = (TEST_LUT_SIZE - 1) * TEST_BYTES_PER_COLOR;
    const topIdx = 0;
    expect(rgbAt(data, bottomIdx)).toEqual(
      rgbAt(lut, (TEST_LUT_SIZE - 1) * TEST_BYTES_PER_COLOR)
    );
    expect(rgbAt(data, topIdx)).toEqual(rgbAt(lut, 0));
  });

  /**
   * Ensure invalid LUTs trigger fail-fast errors.
   * What: Passing short arrays should throw to prevent corrupt output.
   */
  it('throws on incorrect LUT length', () => {
    const badLut = new Uint8Array(10);
    expect(() => buildLegendImageData(badLut, false)).toThrow();
  });
});
