/**
 * Regression test ensuring realistic data generation uses DEFAULT_GENERATED_FPS.
 * What: Confirms frame count calculations rely on the shared constant.
 * Why: Prevents accidental changes to synthetic data rate that could desync demos and tests.
 * How: Generates data with mocked STFT and checks frame length.
 */
import { describe, expect, it, vi } from 'vitest';

// Mock WASM binding so STFT processing is lightweight.
vi.mock('@spectro/wasm-bindings', () => ({
  stftFrame: vi.fn(async (data: Float32Array) => Float32Array.from(data)),
}));

import { DEFAULT_GENERATED_FPS } from '../../constants';

const DataGenerator = await import('../data-generator');
const { generateRealisticSpectrogramData } = DataGenerator;
type SignalConfig = import('../data-generator').SignalConfig;
type SignalType = import('../data-generator').SignalType;

describe('generateRealisticSpectrogramData', () => {
  it('produces frames at DEFAULT_GENERATED_FPS', async () => {
    const config: SignalConfig = {
      sampleRate: DEFAULT_GENERATED_FPS,
      duration: 1,
      windowSize: 1,
      hopSize: 1,
      windowType: 'hann',
      reference: 1,
    };
    const types: SignalType[] = ['music', 'speech'];

    const frames = await generateRealisticSpectrogramData(config, 2, types);

    expect(frames).toHaveLength(types.length * DEFAULT_GENERATED_FPS);
  });
});
