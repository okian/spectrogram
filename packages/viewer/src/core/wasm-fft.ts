import { fft_real } from '../../../dsp/pkg/dsp.js';

export function fftWasm(input: Float32Array): Float32Array {
  return fft_real(input);
}
