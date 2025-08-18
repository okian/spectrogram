import { describe, it, expect } from 'vitest';
import { DEFAULT_SPECTRO_META, generateSineWaveFrames } from '../src';

describe('generateSineWaveFrames', () => {
  it('creates deterministic frames', () => {
    const framesA = generateSineWaveFrames(DEFAULT_SPECTRO_META, 2);
    const framesB = generateSineWaveFrames(DEFAULT_SPECTRO_META, 2);
    expect(framesA).toEqual(framesB);
    expect(framesA[0].bins.length).toBe(DEFAULT_SPECTRO_META.binCount);
    expect(framesA[0].frameIndex).toBe(0);
    expect(framesA[1].frameIndex).toBe(1);
  });
});
