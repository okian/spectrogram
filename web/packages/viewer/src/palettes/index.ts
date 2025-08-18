/**
 * Built-in perceptually uniform colormaps for spectrogram visualization.
 * What: Provides color lookup tables optimized for scientific visualization.
 * Why: Perceptually uniform maps ensure data differences are visually proportional.
 */

/** RGBA color tuple (0-255 range). */
export type RGBA = [number, number, number, number];

/** Built-in palette names. */
export type PaletteName = 'viridis' | 'magma' | 'inferno' | 'plasma' | 'cividis' | 'coolwarm' | 'twilight' | 'turbo';

/** Custom or built-in palette definition. */
export type Palette = PaletteName | { name: string; lut: Uint8Array | number[] };

/**
 * Generate a color from a palette at normalized position (0-1).
 * What: Maps scalar values to colors using bilinear interpolation.
 * Why: Smooth color transitions without banding artifacts.
 */
export function samplePalette(palette: Palette, t: number): RGBA {
  if (typeof palette === 'string') {
    return sampleBuiltinPalette(palette, t);
  }
  
  // Custom palette
  const lut = palette.lut;
  const size = lut.length / 4; // RGBA values
  const idx = Math.max(0, Math.min(size - 2, t * (size - 1)));
  const i = Math.floor(idx);
  const frac = idx - i;
  
  const r1 = lut[i * 4], g1 = lut[i * 4 + 1], b1 = lut[i * 4 + 2], a1 = lut[i * 4 + 3];
  const r2 = lut[(i + 1) * 4], g2 = lut[(i + 1) * 4 + 1], b2 = lut[(i + 1) * 4 + 2], a2 = lut[(i + 1) * 4 + 3];
  
  return [
    Math.round(r1 + (r2 - r1) * frac),
    Math.round(g1 + (g2 - g1) * frac),
    Math.round(b1 + (b2 - b1) * frac),
    Math.round(a1 + (a2 - a1) * frac)
  ];
}

/**
 * Sample a built-in palette at normalized position.
 * What: Interpolates between pre-defined color stops.
 * Why: Built-in maps are carefully designed for perceptual uniformity.
 */
function sampleBuiltinPalette(name: PaletteName, t: number): RGBA {
  const stops = PALETTE_STOPS[name];
  const idx = Math.max(0, Math.min(stops.length - 2, t * (stops.length - 1)));
  const i = Math.floor(idx);
  const frac = idx - i;
  
  const c1 = stops[i];
  const c2 = stops[i + 1];
  
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * frac),
    Math.round(c1[1] + (c2[1] - c1[1]) * frac),
    Math.round(c1[2] + (c2[2] - c1[2]) * frac),
    Math.round(c1[3] + (c2[3] - c1[3]) * frac)
  ];
}

/**
 * Generate a complete LUT for a palette.
 * What: Creates a 256-entry RGBA lookup table.
 * Why: Pre-computed LUTs enable fast GPU texture sampling.
 */
export function generateLUT(palette: Palette, size = 256): Uint8Array {
  const lut = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const color = samplePalette(palette, i / (size - 1));
    lut[i * 4] = color[0];
    lut[i * 4 + 1] = color[1];
    lut[i * 4 + 2] = color[2];
    lut[i * 4 + 3] = color[3];
  }
  return lut;
}

/** Color stops for built-in palettes (simplified versions). */
const PALETTE_STOPS: Record<PaletteName, RGBA[]> = {
  viridis: [
    [68, 1, 84, 255], [72, 35, 116, 255], [67, 68, 137, 255], [56, 90, 163, 255],
    [45, 112, 142, 255], [37, 133, 81, 255], [30, 155, 18, 255], [39, 173, 6, 255],
    [92, 189, 39, 255], [170, 207, 102, 255], [253, 231, 37, 255]
  ],
  magma: [
    [0, 0, 4, 255], [28, 16, 68, 255], [79, 28, 140, 255], [129, 37, 129, 255],
    [181, 54, 122, 255], [229, 80, 57, 255], [251, 135, 97, 255], [254, 196, 79, 255],
    [254, 248, 202, 255]
  ],
  inferno: [
    [0, 0, 4, 255], [31, 12, 72, 255], [85, 15, 109, 255], [141, 19, 88, 255],
    [188, 55, 84, 255], [220, 113, 25, 255], [249, 189, 37, 255], [254, 254, 164, 255]
  ],
  plasma: [
    [13, 8, 135, 255], [84, 2, 163, 255], [139, 10, 165, 255], [185, 50, 137, 255],
    [219, 92, 104, 255], [244, 136, 73, 255], [254, 188, 43, 255], [240, 249, 33, 255]
  ],
  cividis: [
    [0, 32, 76, 255], [0, 42, 102, 255], [0, 52, 110, 255], [39, 63, 108, 255],
    [79, 74, 103, 255], [114, 85, 92, 255], [144, 96, 78, 255], [173, 108, 62, 255],
    [201, 120, 43, 255], [230, 134, 20, 255], [255, 149, 0, 255]
  ],
  coolwarm: [
    [59, 76, 192, 255], [68, 90, 204, 255], [77, 104, 215, 255], [87, 117, 225, 255],
    [98, 130, 234, 255], [108, 142, 241, 255], [119, 154, 247, 255], [130, 165, 251, 255],
    [141, 176, 254, 255], [152, 185, 255, 255], [163, 194, 255, 255], [174, 201, 253, 255],
    [184, 208, 251, 255], [194, 213, 248, 255], [204, 217, 245, 255], [213, 219, 241, 255],
    [221, 221, 236, 255], [229, 216, 229, 255], [236, 211, 220, 255], [241, 204, 211, 255],
    [245, 196, 201, 255], [247, 187, 190, 255], [247, 177, 178, 255], [247, 166, 166, 255],
    [244, 154, 154, 255], [241, 141, 141, 255], [236, 127, 127, 255], [229, 112, 112, 255],
    [222, 96, 96, 255], [213, 80, 80, 255], [203, 62, 62, 255], [193, 43, 43, 255],
    [180, 22, 22, 255], [166, 0, 0, 255]
  ],
  twilight: [
    [225, 216, 226, 255], [221, 209, 221, 255], [216, 201, 216, 255], [211, 193, 211, 255],
    [206, 185, 206, 255], [201, 177, 201, 255], [196, 169, 196, 255], [191, 161, 191, 255],
    [186, 153, 186, 255], [181, 145, 181, 255], [176, 137, 176, 255], [171, 129, 171, 255],
    [166, 121, 166, 255], [161, 113, 161, 255], [156, 105, 156, 255], [151, 97, 151, 255],
    [146, 89, 146, 255], [141, 81, 141, 255], [136, 73, 136, 255], [131, 65, 131, 255],
    [126, 57, 126, 255], [121, 49, 121, 255], [116, 41, 116, 255], [111, 33, 111, 255],
    [106, 25, 106, 255], [101, 17, 101, 255], [96, 9, 96, 255], [91, 1, 91, 255]
  ],
  turbo: [
    [48, 18, 59, 255], [57, 25, 85, 255], [66, 32, 111, 255], [75, 39, 137, 255],
    [84, 46, 163, 255], [93, 53, 189, 255], [102, 60, 215, 255], [111, 67, 241, 255],
    [120, 74, 255, 255], [129, 81, 255, 255], [138, 88, 255, 255], [147, 95, 255, 255],
    [156, 102, 255, 255], [165, 109, 255, 255], [174, 116, 255, 255], [183, 123, 255, 255],
    [192, 130, 255, 255], [201, 137, 255, 255], [210, 144, 255, 255], [219, 151, 255, 255],
    [228, 158, 255, 255], [237, 165, 255, 255], [246, 172, 255, 255], [255, 179, 255, 255],
    [255, 186, 255, 255], [255, 193, 255, 255], [255, 200, 255, 255], [255, 207, 255, 255],
    [255, 214, 255, 255], [255, 221, 255, 255], [255, 228, 255, 255], [255, 235, 255, 255],
    [255, 242, 255, 255], [255, 249, 255, 255]
  ]
};
