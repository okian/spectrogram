/**
 * Default spectrogram background color.
 * What: Shared constant representing the UI's fallback background color.
 * Why: Centralizes styling and avoids magic hex values sprinkled across files.
 * How: Import wherever a default background is needed.
 */
export const DEFAULT_BG = '#111111';

/**
 * Default frames-per-second for synthetic STFT data generation.
 * What: Baseline rate at which spectrogram frames are produced when creating
 * synthetic data.
 * Why: Avoids hardcoded frame counts and keeps demos and tests in sync.
 * How: Multiply a duration in seconds by this constant to determine how many
 * STFT frames to generate.
 */
export const DEFAULT_GENERATED_FPS = 10;
