/**
 * Unit tests for generateMixedSignal normalization logic.
 * What: Validates that mixed signals are normalized and inputs are validated.
 * Why: Prevents clipping and ensures robustness for edge cases.
 */
import { describe, expect, it, vi } from 'vitest';

const DataGenerator = await import('../data-generator');

/** Number of samples in test signals. */
const TEST_LENGTH = 4;
/** Sample rate for test signals in hertz. */
const TEST_SAMPLE_RATE = 48000;

// Shorthand reference for the function under test
const { generateMixedSignal } = DataGenerator;

describe('generateMixedSignal', () => {
  it('normalizes when combined amplitude exceeds limit', () => {
    const generator = () => new Float32Array([1, -1, 1, -1]);
    const result = generateMixedSignal(
      TEST_LENGTH,
      TEST_SAMPLE_RATE,
      [
        { type: 'music', amplitude: 1 },
        { type: 'speech', amplitude: 1 }
      ],
      generator
    );

    const expected = [1, -1, 1, -1];
    Array.from(result).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
  });

  it('returns mixed signal unchanged when within limits', () => {
    const generator = () => new Float32Array([1, -1, 1, -1]);
    const result = generateMixedSignal(
      TEST_LENGTH,
      TEST_SAMPLE_RATE,
      [
        { type: 'music', amplitude: 0.3 },
        { type: 'speech', amplitude: 0.3 }
      ],
      generator
    );

    const expected = [0.6, -0.6, 0.6, -0.6];
    Array.from(result).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
  });

  it('throws on empty source array', () => {
    expect(() =>
      generateMixedSignal(TEST_LENGTH, TEST_SAMPLE_RATE, [])
    ).toThrow('sources array must contain at least one element');
  });

  it('throws on non-positive length', () => {
    expect(() =>
      generateMixedSignal(0, TEST_SAMPLE_RATE, [
        { type: 'music', amplitude: 1 }
      ])
    ).toThrow('length must be positive');
  });

  it('throws on non-positive sample rate', () => {
    expect(() =>
      generateMixedSignal(TEST_LENGTH, 0, [
        { type: 'music', amplitude: 1 }
      ])
    ).toThrow('sampleRate must be positive');
  });

  it('throws when amplitude is out of range', () => {
    expect(() =>
      generateMixedSignal(TEST_LENGTH, TEST_SAMPLE_RATE, [
        { type: 'music', amplitude: 1.5 }
      ])
    ).toThrow(/amplitudes must be finite numbers/);
  });

  it('throws when signal generator returns wrong length', () => {
    const badGenerator = () => new Float32Array([1, -1]);
    expect(() =>
      generateMixedSignal(
        TEST_LENGTH,
        TEST_SAMPLE_RATE,
        [{ type: 'music', amplitude: 1 }],
        badGenerator
      )
    ).toThrow('signalGenerator must return array of requested length');
  });
});
