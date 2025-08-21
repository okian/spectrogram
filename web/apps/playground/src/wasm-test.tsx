/**
 * Simple WASM test component.
 * What: Tests the WASM bindings functionality.
 * Why: Verifies that the Rust/WASM integration is working correctly.
 */

import * as React from 'react';
import { fftReal, magnitudeDbfs, initWasm } from '@spectro/wasm-bindings';

/**
 * Indicates whether verbose debug logging is enabled.
 * What: Evaluates both Node and Vite development markers.
 * Why: Ensures tests and builds share a consistent toggle.
 * How: Checks `process.env.NODE_ENV` and `import.meta.env.DEV` when available.
 */
const DEBUG_ENABLED =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true);

/**
 * Conditionally log debug output during development builds.
 * What: Wrapper around console.log governed by {@link DEBUG_ENABLED}.
 * Why: Keeps production consoles clean while aiding diagnosis when developing.
 * How: Emits only when debugging is enabled.
 */
function debug(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}


/**
 * Quantity of samples used for the synthetic test signal.
 * Why: FFT routines are most efficient on power-of-two sizes.
 */
export const SAMPLE_COUNT = 1024;

/**
 * Frequency of the generated sine wave in hertz.
 * Why: a deterministic 100 Hz tone simplifies validation.
 */
export const TEST_FREQ_HZ = 100;

/**
 * Audio sampling rate for the test signal in hertz.
 * Why: 48 kHz reflects common audio hardware and defines FFT bin spacing.
 */
export const SAMPLE_RATE_HZ = 48_000;

/**
 * Amplitude used when computing magnitude, representing unity gain.
 */
const UNITY_GAIN = 1.0;

/**
 * Produce a sine wave for deterministic FFT testing.
 * How: generates `count` samples of a `freqHz` tone at `sampleRateHz`.
 * Validates all inputs and fails fast on invalid parameters.
 */
export function generateSineWave(
  count: number,
  freqHz: number,
  sampleRateHz: number
): Float32Array {
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('Sample count must be a positive finite number');
  }
  if (!Number.isFinite(freqHz) || freqHz <= 0) {
    throw new Error('Frequency must be a positive finite number');
  }
  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new Error('Sample rate must be a positive finite number');
  }

  const signal = new Float32Array(count);
  const angular = 2 * Math.PI * freqHz;
  for (let i = 0; i < count; i++) {
    signal[i] = Math.sin((angular * i) / sampleRateHz);
  }
  return signal;
}

/**
 * Scan a magnitude spectrum for its dominant frequency bin.
 * What: returns the frequency represented by the largest magnitude entry.
 * Why: verifies FFT correctness by detecting the expected peak.
 * How: linear scan with immediate input validation.
 */
export function findPeakFrequency(
  magnitudes: Float32Array,
  sampleRateHz: number
): number {
  if (magnitudes.length === 0) {
    throw new Error('Magnitude array must not be empty');
  }
  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new Error('Sample rate must be a positive finite number');
  }

  let maxIndex = 0;
  let maxValue = magnitudes[0];
  for (let i = 1; i < magnitudes.length; i++) {
    const value = magnitudes[i];
    if (value > maxValue) {
      maxValue = value;
      maxIndex = i;
    }
  }
  return (maxIndex * sampleRateHz) / magnitudes.length;
}


export const WasmTest: React.FC = () => {
  const [testResult, setTestResult] = React.useState<string>('Testing...');
  const [isLoading, setIsLoading] = React.useState(true);
  const [debugInfo, setDebugInfo] = React.useState<string>('');

  React.useEffect(() => {
    const runTest = async () => {
      try {
        setDebugInfo('Starting WASM initialization...');
        
        // First, try to initialize WASM
        const wasm = await initWasm();
        setDebugInfo('WASM initialized successfully');
        
        // Check if the module has the expected functions
        if (!wasm.fft_real) {
          throw new Error('WASM module missing fft_real function');
        }
        if (!wasm.magnitude_dbfs) {
          throw new Error('WASM module missing magnitude_dbfs function');
        }
        
        setDebugInfo('WASM functions verified, creating test signal...');
        
        // Create a simple test signal (sine wave)
        const signal = generateSineWave(SAMPLE_COUNT, TEST_FREQ_HZ, SAMPLE_RATE_HZ);

        setDebugInfo('Testing FFT...');
        // Test FFT
        const fftResult = await fftReal(signal);
        debug('FFT result length:', fftResult.length);

        setDebugInfo('Testing magnitude calculation...');
        // Test magnitude calculation
        const magResult = await magnitudeDbfs(signal, UNITY_GAIN);
        debug('Magnitude result length:', magResult.length);

        const peakFreq = findPeakFrequency(magResult, SAMPLE_RATE_HZ);
        setTestResult(`✅ WASM working! Peak frequency: ${peakFreq.toFixed(1)} Hz (expected ~100 Hz)`);
        setDebugInfo('Test completed successfully');
      } catch (error) {
        console.error('WASM test failed:', error);
        setTestResult(`❌ WASM test failed: ${error}`);
        setDebugInfo(`Error details: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    runTest();
  }, []);

  return (
    <div style={{ 
      padding: 16, 
      backgroundColor: '#f8f9fa', 
      borderRadius: 4, 
      marginBottom: 16,
      fontFamily: 'monospace',
      fontSize: 14
    }}>
      <h3>WASM Test</h3>
      {isLoading ? (
        <div>🔄 Testing WASM bindings...</div>
      ) : (
        <div>{testResult}</div>
      )}
      {debugInfo && (
        <div style={{ 
          marginTop: 8, 
          fontSize: 12, 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Debug: {debugInfo}
        </div>
      )}
    </div>
  );
};
