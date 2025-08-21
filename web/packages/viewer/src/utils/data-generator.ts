/**
 * Data generator for testing spectrogram visualization.
 * What: Generates synthetic audio signals and STFT frames for testing.
 * Why: Enables development and testing without requiring real audio input.
 */

import { stftFrame } from '@spectro/wasm-bindings';
import { DEFAULT_GENERATED_FPS } from '../constants';

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

/**
 * Maximum allowed signal amplitude before normalization.
 * What: Defines clipping threshold for generated audio.
 * Why: Eliminates magic numbers and centralizes normalization constant.
 */
const MAX_AMPLITUDE = 1.0;

/**
 * Value used to pad incomplete analysis windows.
 * What: Explicit zero constant to avoid magic numbers when padding.
 * Why: Clarifies intent and centralizes padding behavior.
 */
const ZERO_PAD_VALUE = 0;

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
 * How: Validates inputs then synthesizes summed sine waves with optional
 *      modulation, harmonics, and noise.
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
  // Validate array lengths and amplitude ranges to avoid runtime errors
  if (frequencies.length !== amplitudes.length) {
    throw new Error(
      'frequencies and amplitudes arrays must have the same length'
    );
  }

  for (const amp of amplitudes) {
    if (!Number.isFinite(amp) || amp < 0 || amp > MAX_AMPLITUDE) {
      throw new Error(
        `amplitudes must be finite numbers within [0, ${MAX_AMPLITUDE}]`
      );
    }
  }

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
  if (!(signal instanceof Float32Array)) {
    throw new Error('signal must be a Float32Array');
  }
  if (frameCount <= 0) {
    throw new Error('frameCount must be positive');
  }
  if (config.sampleRate <= 0) {
    throw new Error('sampleRate must be positive');
  }
  if (config.windowSize <= 0) {
    throw new Error('windowSize must be positive');
  }
  if (config.hopSize <= 0) {
    throw new Error('hopSize must be positive');
  }

  /** Frames produced by the STFT. */
  const frames: Array<{ bins: Float32Array; timestamp: number }> = [];
  /** Number of samples to advance between frames. */
  const hopSamples = config.hopSize;
  /** Size of each analysis window in samples. */
  const windowSamples = config.windowSize;
  /**
   * Reusable buffer holding the current window of samples.
   * Why: avoids per-frame allocations for performance.
   */
  const windowData = new Float32Array(windowSamples);

  for (let i = 0; i < frameCount; i++) {
    const startSample = i * hopSamples;
    if (startSample >= signal.length) break;

    // Copy available samples and zero-pad remainder.
    const copyLength = Math.min(windowSamples, signal.length - startSample);
    windowData.set(signal.subarray(startSample, startSample + copyLength));
    if (copyLength < windowSamples) {
      windowData.fill(ZERO_PAD_VALUE, copyLength);
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
    
    // Process into STFT frames at DEFAULT_GENERATED_FPS
    const frames = await generateSTFTFrames(
      signal,
      config,
      Math.floor(segmentDuration * DEFAULT_GENERATED_FPS)
    );
    
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
 * How: Mixes individually generated signals and normalizes to prevent clipping.
 * @param signalGenerator Optional injection of signal generator for testing.
 */
export function generateMixedSignal(
  length: number,
  sampleRate: number,
  sources: Array<{ type: SignalType; amplitude: number }>,
  signalGenerator: (length: number, sampleRate: number, type: SignalType) => Float32Array = generateSignalByType
): Float32Array {
  if (length <= 0) {
    throw new Error('length must be positive');
  }
  if (sampleRate <= 0) {
    throw new Error('sampleRate must be positive');
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('sources array must contain at least one element');
  }

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

  if (maxAbs > MAX_AMPLITUDE) {
    const scale = 1 / maxAbs;
    for (let i = 0; i < length; i++) {
      mixedSignal[i] *= scale;
    }
  }

  return mixedSignal;
}

/**
 * Two times Pi, used for oscillation calculations.
 * What: Reusable constant for sine computations.
 * Why: Avoids repeated multiplications and clarifies intent.
 */
const TWO_PI = 2 * Math.PI;

/**
 * Chord progression used to synthesize a simple loop.
 * What: Array of chords with frequencies for each note.
 * Why: Defined once to avoid reallocation on each call.
 */
const CHORDS: number[][] = [
  [220, 277, 330, 440], // A major
  [185, 220, 277, 370], // F# minor
  [147, 185, 220, 294], // D major
  [165, 207, 247, 330]  // E major
];

/** Duration each chord is played, in seconds. */
const CHORD_DURATION_SECONDS = 2;
/** Base amplitude for the root note of each chord. */
const ROOT_NOTE_AMPLITUDE = 0.3;
/** Relative amplitude applied to generated harmonics. */
const HARMONIC_MULTIPLIER = 0.2;
/** Number of harmonics to generate per note. */
const HARMONIC_COUNT = 3;
/** Base level for rhythm modulation. */
const RHYTHM_BASE_LEVEL = 0.5;
/** Depth of rhythm modulation. */
const RHYTHM_DEPTH = 0.5;
/** Frequency of rhythm modulation in hertz. */
const RHYTHM_FREQUENCY = 0.5;
/** Amplitude of random noise added for realism. */
const NOISE_AMPLITUDE = 0.02;

/**
 * Generate a realistic music-like signal with chord progressions.
 * What: Creates musical content with changing harmonies over time.
 * Why: Provides engaging, familiar audio content for demonstration.
 * How: Synthesizes chords, applies harmonics, rhythm modulation and noise.
 */
export function generateMusicSignal(
  length: number,
  sampleRate: number
): Float32Array {
  if (length <= 0) {
    throw new Error('length must be positive');
  }
  if (sampleRate <= 0) {
    throw new Error('sampleRate must be positive');
  }

  const signal = new Float32Array(length);
  const timeStep = 1 / sampleRate;
  const chordSamples = Math.floor(CHORD_DURATION_SECONDS * sampleRate);

  for (let i = 0; i < length; i++) {
    const time = i * timeStep;
    const chordIndex = Math.floor(i / chordSamples) % CHORDS.length;
    const chord = CHORDS[chordIndex];

    let sample = 0;
    chord.forEach((freq, noteIndex) => {
      const noteAmp = ROOT_NOTE_AMPLITUDE / (noteIndex + 1);
      sample += noteAmp * Math.sin(TWO_PI * freq * time);

      for (let h = 2; h <= HARMONIC_COUNT; h++) {
        sample +=
          (noteAmp * HARMONIC_MULTIPLIER / h) *
          Math.sin(TWO_PI * freq * h * time);
      }
    });

    const rhythm =
      RHYTHM_BASE_LEVEL +
      RHYTHM_DEPTH * Math.sin(TWO_PI * RHYTHM_FREQUENCY * time);
    sample = sample * rhythm +
      NOISE_AMPLITUDE * (Math.random() * 2 - 1);

    signal[i] = sample;
  }

  return signal;
}
