/**
 * Unit tests for generateMusicSignal.
 * What: Verifies signal length, amplitude range, and input validation.
 * Why: Ensures music signal generation is deterministic and safe.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DataGenerator = await import('../data-generator');

// Shorthand reference for function under test
const { generateMusicSignal } = DataGenerator;

/** Number of samples to generate for testing. */
const TEST_LENGTH = 48;
/** Sample rate for testing, in hertz. */
const TEST_SAMPLE_RATE = 48000;

describe('generateMusicSignal', () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Make noise deterministic for assertions
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it('produces signal of requested length within [-1,1]', () => {
    const result = generateMusicSignal(TEST_LENGTH, TEST_SAMPLE_RATE);
    expect(result.length).toBe(TEST_LENGTH);
    Array.from(result).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('throws on non-positive length', () => {
    expect(() => generateMusicSignal(0, TEST_SAMPLE_RATE)).toThrow(
      'length must be positive'
    );
  });

  it('throws on non-positive sample rate', () => {
    expect(() => generateMusicSignal(TEST_LENGTH, 0)).toThrow(
      'sampleRate must be positive'
    );
  });
});
