/**
 * Simple WASM test component.
 * What: Tests the WASM bindings functionality.
 * Why: Verifies that the Rust/WASM integration is working correctly.
 */

import * as React from 'react';
import { fftReal, magnitudeDbfs, initWasm } from '@spectro/wasm-bindings';

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
        const signal = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
          signal[i] = Math.sin(2 * Math.PI * 100 * i / 1024); // 100 Hz sine wave
        }

        setDebugInfo('Testing FFT...');
        // Test FFT
        const fftResult = await fftReal(signal);
        console.log('FFT result length:', fftResult.length);

        setDebugInfo('Testing magnitude calculation...');
        // Test magnitude calculation
        const magResult = await magnitudeDbfs(signal, 1.0);
        console.log('Magnitude result length:', magResult.length);

        // Find peak frequency
        let maxIndex = 0;
        let maxValue = magResult[0];
        for (let i = 1; i < magResult.length; i++) {
          if (magResult[i] > maxValue) {
            maxValue = magResult[i];
            maxIndex = i;
          }
        }

        const peakFreq = (maxIndex * 48000) / 1024; // Assuming 48kHz sample rate
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
