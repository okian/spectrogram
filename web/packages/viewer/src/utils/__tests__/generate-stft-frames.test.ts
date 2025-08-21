/**
 * Regression tests for generateSTFTFrames.
 * What: Ensures STFT frames are correctly generated and buffer reuse behaves as expected.
 * Why: Prevents regressions in window handling after refactors.
 */
import { describe, expect, it, vi } from 'vitest';

// Mock WASM binding to simply echo the provided window data.
vi.mock('@spectro/wasm-bindings', () => ({
  stftFrame: vi.fn(async (data: Float32Array) => Float32Array.from(data))
}));

const DataGenerator = await import('../data-generator');
const { generateSTFTFrames } = DataGenerator;
type SignalConfig = import('../data-generator').SignalConfig;

/** Example signal for testing. */
const TEST_SIGNAL = Float32Array.from([1, 2, 3, 4, 5]);
/** STFT configuration for testing. */
const TEST_CONFIG: SignalConfig = {
  sampleRate: 1,
  duration: 5,
  windowSize: 4,
  hopSize: 2,
  windowType: 'hann',
  reference: 1
};
/** Number of frames to request. */
const TEST_FRAME_COUNT = 3;

describe('generateSTFTFrames', () => {
  it('generates expected frames and reuses buffer', async () => {
    const frames = await generateSTFTFrames(
      TEST_SIGNAL,
      TEST_CONFIG,
      TEST_FRAME_COUNT
    );

    expect(frames).toHaveLength(TEST_FRAME_COUNT);
    expect(frames[0].bins).toEqual(Float32Array.from([1, 2, 3, 4]));
    expect(frames[1].bins).toEqual(Float32Array.from([3, 4, 5, 0]));
    expect(frames[2].bins).toEqual(Float32Array.from([5, 0, 0, 0]));

    const mock = (await import('@spectro/wasm-bindings')).stftFrame as ReturnType<
      typeof vi.fn
    >;
    expect(mock).toHaveBeenCalledTimes(TEST_FRAME_COUNT);
    const firstArg = mock.mock.calls[0][0];
    mock.mock.calls.forEach(call => {
      expect(call[0]).toBe(firstArg);
    });
  });
});
