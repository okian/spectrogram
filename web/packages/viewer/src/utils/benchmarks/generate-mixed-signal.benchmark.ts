/**
 * Benchmark comparing original and refactored generateMixedSignal implementations.
 * What: Measures execution time to validate reduced per-sample overhead.
 * Why: Ensures refactor genuinely improves performance.
 * How: Runs both implementations over fixed inputs for multiple iterations and reports timings.
 */
/**
 * Refactored implementation imported in production but duplicated here to avoid
 * pulling in heavy dependencies during benchmarking.
 */
function generateMixedSignal(
  length: number,
  sampleRate: number,
  sources: Array<{ type: string; amplitude: number }>,
  signalGenerator: (length: number, sampleRate: number, type: string) => Float32Array
): Float32Array {
  if (length <= 0) throw new Error('length must be positive');
  if (sampleRate <= 0) throw new Error('sampleRate must be positive');
  if (!Array.isArray(sources) || sources.length === 0)
    throw new Error('sources array must contain at least one element');

  const mixedSignal = new Float32Array(length);
  for (const { type, amplitude } of sources) {
    if (!Number.isFinite(amplitude) || amplitude < 0 || amplitude > 1) {
      throw new Error('amplitudes must be finite numbers within [0, 1]');
    }
    const sourceSignal = signalGenerator(length, sampleRate, type);
    if (sourceSignal.length !== length) {
      throw new Error('signalGenerator must return array of requested length');
    }
    for (let i = 0; i < length; i++) {
      mixedSignal[i] += sourceSignal[i] * amplitude;
    }
  }

  let maxAbs = 0;
  for (let i = 0; i < length; i++) {
    const absVal = Math.abs(mixedSignal[i]);
    if (absVal > maxAbs) {
      maxAbs = absVal;
    }
  }

  if (maxAbs > 1) {
    const scale = 1 / maxAbs;
    for (let i = 0; i < length; i++) {
      mixedSignal[i] *= scale;
    }
  }

  return mixedSignal;
}

/** Number of iterations for averaging runtime. */
const ITERATIONS = 100;
/** Length of each signal in samples. */
const LENGTH = 48000;
/** Sample rate in hertz. */
const SAMPLE_RATE = 48000;
/** Two sample sources with equal amplitude. */
const SOURCES = [
  { type: 'music' as const, amplitude: 0.5 },
  { type: 'speech' as const, amplitude: 0.5 }
];

/**
 * Original implementation that computed normalization during mixing.
 * What: Mirrors pre-refactor logic for comparison.
 * Why: Provides baseline to demonstrate improvement.
 */
function originalGenerateMixedSignal(
  length: number,
  sampleRate: number,
  sources: Array<{ type: string; amplitude: number }>,
  signalGenerator: (length: number, sampleRate: number, type: string) => Float32Array
): Float32Array {
  if (length <= 0) throw new Error('length must be positive');
  if (sampleRate <= 0) throw new Error('sampleRate must be positive');
  if (!Array.isArray(sources) || sources.length === 0)
    throw new Error('sources array must contain at least one element');

  const mixedSignal = new Float32Array(length);
  let maxAbs = 0;
  for (const source of sources) {
    const sourceSignal = signalGenerator(length, sampleRate, source.type);
    const amplitude = source.amplitude;
    for (let i = 0; i < length; i++) {
      mixedSignal[i] += sourceSignal[i] * amplitude;
      const absVal = Math.abs(mixedSignal[i]);
      if (absVal > maxAbs) {
        maxAbs = absVal;
      }
    }
  }
  if (maxAbs > 1) {
    const scale = 1 / maxAbs;
    for (let i = 0; i < length; i++) {
      mixedSignal[i] *= scale;
    }
  }
  return mixedSignal;
}

/**
 * Simple deterministic signal generator used for benchmarking.
 * What: Returns an array filled with a constant value.
 * Why: Avoids measuring unrelated work such as sine generation.
 */
function constantGenerator(
  length: number,
  _sampleRate: number,
  _type: string
): Float32Array {
  return new Float32Array(length).fill(0.5);
}

/** Measure runtime of given function. */
function benchmark(
  label: string,
  fn: (
    length: number,
    sampleRate: number,
    sources: Array<{ type: string; amplitude: number }>,
    signalGenerator: (
      length: number,
      sampleRate: number,
      type: string
    ) => Float32Array
  ) => Float32Array
): number {
  const start = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    fn(LENGTH, SAMPLE_RATE, SOURCES, constantGenerator);
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // Convert to milliseconds
}

const originalTime = benchmark('original', originalGenerateMixedSignal);
const refactoredTime = benchmark('refactored', generateMixedSignal);

console.log(`Original implementation: ${originalTime.toFixed(2)} ms`);
console.log(`Refactored implementation: ${refactoredTime.toFixed(2)} ms`);
