import { describe, it, expect } from 'vitest';
import { palettes, getPalette, decodePalette } from '../src/palettes';
import type { PaletteName } from '../src';

describe('default palettes', () => {
  const names: PaletteName[] = [
    'viridis',
    'magma',
    'inferno',
    'plasma',
    'cividis',
    'coolwarm',
    'twilight',
    'turbo',
  ];

  it('provides 256x4 RGBA arrays for each palette', () => {
    for (const name of names) {
      const lut = getPalette(name);
      expect(lut).toBeInstanceOf(Uint8Array);
      expect(lut.length).toBe(256 * 4);
      expect(palettes[name]).toBe(lut);
    }
  });

  it('decodes base64 without Buffer using atob', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = (globalThis as any).Buffer;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Buffer = undefined;
      const arr = decodePalette('AQID');
      expect(Array.from(arr)).toEqual([1, 2, 3]);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Buffer = original;
    }
  });
});
