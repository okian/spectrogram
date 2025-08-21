import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_COUNT,
  TEST_FREQ_HZ,
  SAMPLE_RATE_HZ,
  generateSineWave,
  findPeakFrequency,
} from './wasm-test.tsx';

/**
 * Verify signal generation and validate error paths.
 */
test('generateSineWave produces samples and guards inputs', () => {
  const signal = generateSineWave(SAMPLE_COUNT, TEST_FREQ_HZ, SAMPLE_RATE_HZ);
  assert.equal(signal.length, SAMPLE_COUNT);
  assert.ok(signal.some((v) => v !== 0), 'signal should contain varying samples');
  assert.throws(() => generateSineWave(0, TEST_FREQ_HZ, SAMPLE_RATE_HZ));
  assert.throws(() => generateSineWave(SAMPLE_COUNT, -1, SAMPLE_RATE_HZ));
  assert.throws(() => generateSineWave(SAMPLE_COUNT, TEST_FREQ_HZ, 0));
});

/**
 * Confirm peak frequency detection and edge handling.
 */
test('findPeakFrequency identifies dominant bin and validates inputs', () => {
  const mag = new Float32Array(SAMPLE_COUNT);
  mag[5] = 10; // dominant bin
  const freq = findPeakFrequency(mag, SAMPLE_RATE_HZ);
  assert.equal(freq, (5 * SAMPLE_RATE_HZ) / SAMPLE_COUNT);
  assert.throws(() => findPeakFrequency(new Float32Array([]), SAMPLE_RATE_HZ));
  assert.throws(() => findPeakFrequency(mag, 0));
});
