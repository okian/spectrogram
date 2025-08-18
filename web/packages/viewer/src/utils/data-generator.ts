/**
 * Data generator for testing spectrogram visualization.
 * What: Generates synthetic audio signals and STFT frames for testing.
 * Why: Enables development and testing without requiring real audio input.
 */

import { stftFrame } from '@spectro/wasm-bindings';

/** Configuration for generating test signals. */
export interface SignalConfig {
  sampleRate: number;
  duration: number;
  windowSize: number;
  hopSize: number;
  windowType: 'hann' | 'hamming' | 'blackman' | 'none';
  reference: number;
}

/** Default configuration for signal generation. */
export const DEFAULT_CONFIG: SignalConfig = {
  sampleRate: 48000,
  duration: 10, // 10 seconds
  windowSize: 2048,
  hopSize: 512,
  windowType: 'hann',
  reference: 1.0
};

/** Types of realistic audio signals. */
export type SignalType = 
  | 'music' 
  | 'speech' 
  | 'noise' 
  | 'chirp' 
  | 'tones' 
  | 'drums' 
  | 'ambient' 
  | 'electronic';

/** Configuration for different signal types. */
export interface SignalTypeConfig {
  frequencies: number[];
  amplitudes: number[];
  noiseLevel: number;
  modulation: boolean;
  harmonics: boolean;
  timeVarying: boolean;
}

/** Preset configurations for different signal types. */
export const SIGNAL_PRESETS: Record<SignalType, SignalTypeConfig> = {
  music: {
    frequencies: [220, 440, 880, 1320, 1760, 2200, 2640, 3520], // A3, A4, A5, E6, A6, etc.
    amplitudes: [1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1],
    noiseLevel: 0.05,
    modulation: true,
    harmonics: true,
    timeVarying: true
  },
  speech: {
    frequencies: [85, 170, 340, 680, 1360, 2720, 5440], // Fundamental + formants
    amplitudes: [0.3, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05],
    noiseLevel: 0.1,
    modulation: true,
    harmonics: false,
    timeVarying: true
  },
  noise: {
    frequencies: [100, 200, 400, 800, 1600, 3200, 6400, 12800],
    amplitudes: [0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2, 0.1],
    noiseLevel: 0.8,
    modulation: false,
    harmonics: false,
    timeVarying: true
  },
  chirp: {
    frequencies: [100, 200, 400, 800, 1600, 3200, 6400, 12800],
    amplitudes: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    noiseLevel: 0.02,
    modulation: true,
    harmonics: false,
    timeVarying: true
  },
  tones: {
    frequencies: [440, 554, 659, 880, 1109, 1319, 1760], // A4, C#5, E5, A5, C#6, E6, A6
    amplitudes: [1.0, 0.7, 0.8, 0.6, 0.5, 0.4, 0.3],
    noiseLevel: 0.01,
    modulation: false,
    harmonics: true,
    timeVarying: false
  },
  drums: {
    frequencies: [60, 120, 240, 480, 960, 1920, 3840], // Kick, snare, hi-hat frequencies
    amplitudes: [0.9, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1],
    noiseLevel: 0.3,
    modulation: true,
    harmonics: false,
    timeVarying: true
  },
  ambient: {
    frequencies: [55, 110, 220, 440, 880, 1760, 3520], // Low ambient tones
    amplitudes: [0.4, 0.3, 0.2, 0.15, 0.1, 0.05, 0.02],
    noiseLevel: 0.2,
    modulation: true,
    harmonics: true,
    timeVarying: true
  },
  electronic: {
    frequencies: [100, 200, 400, 800, 1600, 3200, 6400, 12800],
    amplitudes: [0.6, 0.7, 0.8, 0.9, 0.8, 0.7, 0.6, 0.5],
    noiseLevel: 0.1,
    modulation: true,
    harmonics: true,
    timeVarying: true
  }
};

/**
 * Generate a realistic test signal with multiple frequencies and noise.
 * What: Creates a complex audio signal with multiple components
 * Why: Provides realistic data for testing spectrogram visualization
 */
export function generateTestSignal(
  length: number, 
  sampleRate: number, 
  frequencies: number[], 
  amplitudes: number[],
  noiseLevel: number = 0.05,
  modulation: boolean = false,
  harmonics: boolean = false,
  timeVarying: boolean = false
): Float32Array {
  const signal = new Float32Array(length);
  const timeStep = 1.0 / sampleRate;
  
  for (let i = 0; i < length; i++) {
    const time = i * timeStep;
    let sample = 0;
    
    // Add fundamental frequencies
    for (let j = 0; j < frequencies.length; j++) {
      const freq = frequencies[j];
      const amp = amplitudes[j];
      
      // Time-varying amplitude for realistic signals
      let timeAmp = amp;
      if (timeVarying) {
        timeAmp *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * time + j);
      }
      
      // Frequency modulation for realistic signals
      let timeFreq = freq;
      if (modulation) {
        timeFreq *= 1.0 + 0.01 * Math.sin(2 * Math.PI * 0.05 * time);
      }
      
      sample += timeAmp * Math.sin(2 * Math.PI * timeFreq * time);
      
      // Add harmonics for richer sound
      if (harmonics) {
        for (let h = 2; h <= 4; h++) {
          const harmonicAmp = timeAmp * (0.3 / h);
          sample += harmonicAmp * Math.sin(2 * Math.PI * timeFreq * h * time);
        }
      }
    }
    
    // Add realistic noise
    if (noiseLevel > 0) {
      sample += noiseLevel * (Math.random() * 2 - 1);
    }
    
    // Apply gentle envelope to avoid clicks
    const envelope = Math.min(1.0, i / 1000) * Math.min(1.0, (length - i) / 1000);
    signal[i] = sample * envelope;
  }
  
  return signal;
}

/**
 * Generate a signal based on a preset type.
 * What: Creates realistic audio signals for different scenarios
 * Why: Provides varied, realistic test data for the spectrogram
 */
export function generateSignalByType(
  length: number,
  sampleRate: number,
  type: SignalType
): Float32Array {
  const preset = SIGNAL_PRESETS[type];
  return generateTestSignal(
    length,
    sampleRate,
    preset.frequencies,
    preset.amplitudes,
    preset.noiseLevel,
    preset.modulation,
    preset.harmonics,
    preset.timeVarying
  );
}

/**
 * Generate a frequency sweep (chirp) signal.
 * What: Creates a signal that sweeps through frequencies over time
 * Why: Useful for testing frequency response and time-frequency analysis
 */
export function generateChirpSignal(
  length: number,
  sampleRate: number,
  startFreq: number = 100,
  endFreq: number = 8000,
  amplitude: number = 1.0
): Float32Array {
  const signal = new Float32Array(length);
  const timeStep = 1.0 / sampleRate;
  const duration = length * timeStep;
  
  for (let i = 0; i < length; i++) {
    const time = i * timeStep;
    const progress = time / duration;
    
    // Logarithmic frequency sweep (more natural for audio)
    const freq = startFreq * Math.pow(endFreq / startFreq, progress);
    
    signal[i] = amplitude * Math.sin(2 * Math.PI * freq * time);
  }
  
  return signal;
}

/**
 * Generate a tone burst signal with gaps.
 * What: Creates intermittent tones with silence periods
 * Why: Tests spectrogram's ability to show temporal gaps and transients
 */
export function generateToneBurstSignal(
  length: number,
  sampleRate: number,
  frequencies: number[] = [440, 880, 1320],
  burstDuration: number = 0.5,
  gapDuration: number = 0.3
): Float32Array {
  const signal = new Float32Array(length);
  const timeStep = 1.0 / sampleRate;
  const burstSamples = Math.floor(burstDuration * sampleRate);
  const gapSamples = Math.floor(gapDuration * sampleRate);
  const cycleSamples = burstSamples + gapSamples;
  
  for (let i = 0; i < length; i++) {
    const cyclePosition = i % cycleSamples;
    
    if (cyclePosition < burstSamples) {
      const time = i * timeStep;
      const freqIndex = Math.floor(i / cycleSamples) % frequencies.length;
      const freq = frequencies[freqIndex];
      
      // Apply envelope to avoid clicks
      const envelope = Math.min(1.0, cyclePosition / 100) * 
                      Math.min(1.0, (burstSamples - cyclePosition) / 100);
      
      signal[i] = envelope * Math.sin(2 * Math.PI * freq * time);
    }
  }
  
  return signal;
}

/**
 * Generate STFT frames from a signal using WASM.
 * What: Processes audio signal into time-frequency representation
 * Why: Provides the core data for spectrogram visualization
 */
export async function generateSTFTFrames(
  signal: Float32Array,
  config: SignalConfig,
  frameCount: number = 100
): Promise<Array<{ bins: Float32Array; timestamp: number }>> {
  const frames: Array<{ bins: Float32Array; timestamp: number }> = [];
  const hopSamples = config.hopSize;
  const windowSamples = config.windowSize;
  
  for (let i = 0; i < frameCount; i++) {
    const startSample = i * hopSamples;
    const endSample = Math.min(startSample + windowSamples, signal.length);
    
    if (endSample <= startSample) break;
    
    // Extract window of samples
    const windowData = new Float32Array(windowSamples);
    for (let j = 0; j < windowSamples; j++) {
      const sampleIndex = startSample + j;
      windowData[j] = sampleIndex < signal.length ? signal[sampleIndex] : 0;
    }
    
    // Process through WASM
    const bins = await stftFrame(windowData, config.windowType, config.reference);
    
    frames.push({
      bins,
      timestamp: startSample / config.sampleRate
    });
  }
  
  return frames;
}

/**
 * Generate a continuous stream of realistic spectrogram data.
 * What: Creates varied, realistic spectrogram frames over time
 * Why: Provides engaging demo data that showcases different signal characteristics
 */
export async function generateRealisticSpectrogramData(
  config: SignalConfig,
  duration: number = 30,
  signalTypes: SignalType[] = ['music', 'speech', 'noise', 'chirp', 'tones']
): Promise<Array<{ bins: Float32Array; timestamp: number; type: SignalType }>> {
  const allFrames: Array<{ bins: Float32Array; timestamp: number; type: SignalType }> = [];
  const segmentDuration = duration / signalTypes.length;
  const sampleRate = config.sampleRate;
  
  for (let segmentIndex = 0; segmentIndex < signalTypes.length; segmentIndex++) {
    const signalType = signalTypes[segmentIndex];
    const segmentSamples = Math.floor(segmentDuration * sampleRate);
    
    // Generate signal for this segment
    const signal = generateSignalByType(segmentSamples, sampleRate, signalType);
    
    // Process into STFT frames
    const frames = await generateSTFTFrames(signal, config, Math.floor(segmentDuration * 10));
    
    // Add type information and adjust timestamps
    const timeOffset = segmentIndex * segmentDuration;
    frames.forEach(frame => {
      allFrames.push({
        bins: frame.bins,
        timestamp: frame.timestamp + timeOffset,
        type: signalType
      });
    });
  }
  
  return allFrames;
}

/**
 * Generate a mixed signal with multiple simultaneous sources.
 * What: Creates complex audio with overlapping frequency content
 * Why: Tests spectrogram's ability to show multiple simultaneous signals
 */
export function generateMixedSignal(
  length: number,
  sampleRate: number,
  sources: Array<{ type: SignalType; amplitude: number }>
): Float32Array {
  const mixedSignal = new Float32Array(length);
  
  sources.forEach(source => {
    const sourceSignal = generateSignalByType(length, sampleRate, source.type);
    for (let i = 0; i < length; i++) {
      mixedSignal[i] += sourceSignal[i] * source.amplitude;
    }
  });
  
  // Normalize to prevent clipping
  const maxAmplitude = Math.max(...Array.from(mixedSignal).map(Math.abs));
  if (maxAmplitude > 1.0) {
    for (let i = 0; i < length; i++) {
      mixedSignal[i] /= maxAmplitude;
    }
  }
  
  return mixedSignal;
}

/**
 * Generate a realistic music-like signal with chord progressions.
 * What: Creates musical content with changing harmonies over time
 * Why: Provides engaging, familiar audio content for demonstration
 */
export function generateMusicSignal(
  length: number,
  sampleRate: number
): Float32Array {
  const signal = new Float32Array(length);
  const timeStep = 1.0 / sampleRate;
  
  // Define chord progressions (A major, F# minor, D major, E major)
  const chords = [
    [220, 277, 330, 440], // A major
    [185, 220, 277, 370], // F# minor
    [147, 185, 220, 294], // D major
    [165, 207, 247, 330]  // E major
  ];
  
  const chordDuration = 2.0; // 2 seconds per chord
  const chordSamples = Math.floor(chordDuration * sampleRate);
  
  for (let i = 0; i < length; i++) {
    const time = i * timeStep;
    const chordIndex = Math.floor(time / chordDuration) % chords.length;
    const chord = chords[chordIndex];
    
    let sample = 0;
    chord.forEach((freq, noteIndex) => {
      const noteAmp = 0.3 / (noteIndex + 1); // Root note louder
      sample += noteAmp * Math.sin(2 * Math.PI * freq * time);
      
      // Add harmonics for richer sound
      for (let h = 2; h <= 3; h++) {
        sample += (noteAmp * 0.2 / h) * Math.sin(2 * Math.PI * freq * h * time);
      }
    });
    
    // Add gentle rhythm modulation
    const rhythm = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * time);
    sample *= rhythm;
    
    // Add subtle noise for realism
    sample += 0.02 * (Math.random() * 2 - 1);
    
    signal[i] = sample;
  }
  
  return signal;
}
