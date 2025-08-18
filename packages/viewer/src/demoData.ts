import type { SpectroMeta, SpectroFrame } from './index';

/**
 * Generate deterministic spectrogram frames using a simple sine wave pattern.
 * The output is suitable for Storybook examples and Playwright tests.
 */
export function generateSineWaveFrames(
  meta: SpectroMeta,
  frameCount: number,
): SpectroFrame[] {
  const frames: SpectroFrame[] = [];
  for (let i = 0; i < frameCount; i++) {
    const bins = new Float32Array(meta.binCount);
    for (let b = 0; b < meta.binCount; b++) {
      bins[b] = Math.sin((b + i) * 0.1);
    }
    frames.push({
      channelId: 0,
      frameIndex: i,
      timestampUs: Math.round((i * meta.hopSize * 1e6) / meta.sampleRateHz),
      bins,
    });
  }
  return frames;
}
