/**
 * Unit tests for generateTestSignal validation.
 * What: Ensures generateTestSignal rejects invalid configuration parameters.
 * Why: Guards against malformed inputs that could corrupt synthetic audio.
 */
import { describe, expect, it } from 'vitest';

const DataGenerator = await import('../data-generator');

/** Shorthand reference for function under test. */
const { generateTestSignal } = DataGenerator;

/** Number of samples used in validation tests. */
const TEST_LENGTH = 8;
/** Sample rate in hertz used for validation tests. */
const TEST_SAMPLE_RATE = 48_000;
/** Single frequency used to produce deterministic validation signals. */
const TEST_FREQUENCIES = [440];
/** Error message thrown for invalid amplitude values. */
const AMP_ERROR_MESSAGE =
  'amplitudes must be finite numbers within [0, 1]';

describe('generateTestSignal validation', () => {
  it('throws when frequencies and amplitudes lengths differ', () => {
    expect(() =>
      generateTestSignal(TEST_LENGTH, TEST_SAMPLE_RATE, TEST_FREQUENCIES, [])
    ).toThrow('frequencies and amplitudes arrays must have the same length');
  });

  it.each([
    /** Negative amplitude below lower bound. */
    { amplitudes: [-0.1] },
    /** Amplitude exceeding MAX_AMPLITUDE. */
    { amplitudes: [1.1] },
    /** Amplitude that is not a finite number. */
    { amplitudes: [Number.NaN] }
  ])('throws on invalid amplitudes: %o', ({ amplitudes }) => {
    expect(() =>
      generateTestSignal(
        TEST_LENGTH,
        TEST_SAMPLE_RATE,
        TEST_FREQUENCIES,
        amplitudes
      )
    ).toThrow(AMP_ERROR_MESSAGE);
  });
});

