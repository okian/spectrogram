use rustfft::{num_complex::Complex32, FftPlanner};
use std::{
    f32::consts::PI,
    sync::{Mutex, OnceLock},
};
use wasm_bindgen::prelude::*;

/// Lazily initialized global planner for FFT computations.
///
/// # What
/// Shares a single `FftPlanner` instance across calls.
///
/// # Why
/// Creating a planner allocates and caches FFT algorithms. Reusing a single
/// instance avoids repeated allocations and planning overhead.
static FFT_PLANNER: OnceLock<Mutex<FftPlanner<f32>>> = OnceLock::new();

/// Retrieve the global FFT planner, initializing it on first use.
///
/// # How
/// Wraps the planner in a `Mutex` for interior mutability because planning
/// requires mutable access to cache FFT algorithms by size.
fn planner() -> &'static Mutex<FftPlanner<f32>> {
    FFT_PLANNER.get_or_init(|| Mutex::new(FftPlanner::new()))
}

/// Full circle constant used in window and FFT calculations.
const TWO_PI: f32 = 2.0 * PI;

/// Smallest allowed reference amplitude to avoid division-by-zero and
/// log-of-zero when converting to decibels.
const EPSILON: f32 = 1e-12;

/// Linear-to-decibel scaling factor (20 * log10(x)).
const DB_SCALE: f32 = 20.0;

/// Coefficient for the Hann window: 0.5 - 0.5 * cos(theta).
const HANN_A0: f32 = 0.5;

/// Secondary coefficient for the Hann window.
const HANN_A1: f32 = 0.5;

/// Coefficients for the Hamming window formula.
const HAMMING_ALPHA: f32 = 0.54;
const HAMMING_BETA: f32 = 0.46;

/// Coefficients for the Blackman window formula.
const BLACKMAN_A0: f32 = 0.42;
const BLACKMAN_A1: f32 = 0.5;
const BLACKMAN_A2: f32 = 0.08;

// Set panic hook for better error messages in wasm
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// Compute the forward real-to-complex FFT using the `rustfft` library.
///
/// # What
/// Returns a flat array `[re0, im0, re1, im1, ...]` suitable for
/// uploading to GPU textures without additional rearrangement.
///
/// # Why
/// Replaces the previous \(O(n^2)\) reference implementation with a
/// fast \(O(n \log n)\) FFT for significant performance gains.
#[wasm_bindgen]
pub fn fft_real(input: &[f32]) -> Vec<f32> {
    let n = input.len();
    if n == 0 {
        return Vec::new();
    }
    if input.iter().any(|v| !v.is_finite()) {
        panic!("fft_real: input contains non-finite values");
    }

    // Convert real input into complex numbers required by `rustfft`.
    let mut buffer: Vec<Complex32> = input.iter().map(|&x| Complex32::new(x, 0.0)).collect();

    // Plan and execute the FFT using the shared planner.
    // Acquire planner lock only for planning to minimize contention.
    let fft = {
        let mut planner = planner().lock().expect("planner lock");
        planner.plan_fft_forward(n)
    };
    fft.process(&mut buffer);

    // Flatten complex results into interleaved real/imaginary pairs.
    let mut output = Vec::with_capacity(2 * n);
    for c in buffer {
        output.push(c.re);
        output.push(c.im);
    }
    output
}

/// Apply window function to input buffer. What: Multiplies input by window coefficients.
/// Why: Reduces spectral leakage in FFT analysis.
#[wasm_bindgen]
pub fn apply_window(input: &[f32], window_type: &str) -> Vec<f32> {
    let n = input.len();
    if input.iter().any(|v| !v.is_finite()) {
        panic!("apply_window: input contains non-finite values");
    }
    let mut output = vec![0.0f32; n];
    let denom = (n as f32 - 1.0).max(1.0);
    match window_type {
        "hann" => {
            for (i, &x) in input.iter().enumerate() {
                let phase = TWO_PI * i as f32 / denom;
                let w = HANN_A0 - HANN_A1 * phase.cos();
                output[i] = x * w;
            }
        }
        "hamming" => {
            for (i, &x) in input.iter().enumerate() {
                let phase = TWO_PI * i as f32 / denom;
                let w = HAMMING_ALPHA - HAMMING_BETA * phase.cos();
                output[i] = x * w;
            }
        }
        "blackman" => {
            for (i, &x) in input.iter().enumerate() {
                let phase = TWO_PI * i as f32 / denom;
                let w = BLACKMAN_A0 - BLACKMAN_A1 * phase.cos() + BLACKMAN_A2 * (2.0 * phase).cos();
                output[i] = x * w;
            }
        }
        _ => output.copy_from_slice(input), // No window
    }
    output
}

/// Compute STFT frame: window + FFT + magnitude. What: Complete STFT pipeline in WASM.
/// Why: Single call reduces JS↔WASM boundary crossings for performance.
#[wasm_bindgen]
pub fn stft_frame(input: &[f32], window_type: &str, reference: f32) -> Vec<f32> {
    let windowed = apply_window(input, window_type);
    magnitude_dbfs(&windowed, reference)
}

/// Compute magnitude spectrum in dBFS from a real block. Windowing is expected to be done by caller.
#[wasm_bindgen]
pub fn magnitude_dbfs(input: &[f32], reference: f32) -> Vec<f32> {
    if input.iter().any(|v| !v.is_finite()) {
        panic!("magnitude_dbfs: input contains non-finite values");
    }
    let spec = fft_real(input);
    let mut mags = Vec::with_capacity(spec.len() / 2);
    let mut i = 0usize;
    let safe_ref = reference.max(EPSILON);
    while i + 1 < spec.len() {
        let re = spec[i];
        let im = spec[i + 1];
        let mag = (re * re + im * im).sqrt();
        let db = DB_SCALE * (mag / safe_ref).log10();
        mags.push(db);
        i += 2;
    }
    mags
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    /// Tolerance for floating point comparisons in tests.
    const TOLERANCE: f32 = 1e-3;

    /// Size of the test signal used for performance comparisons.
    const PERF_SIZE: usize = 512;

    /// Number of iterations to use when benchmarking planner reuse.
    const BENCH_RUNS: usize = 100;

    /// Naive \(O(n^2)\) FFT used as a correctness reference.
    fn reference_fft(input: &[f32]) -> Vec<f32> {
        let n = input.len();
        let mut output = vec![0.0f32; 2 * n];
        for k in 0..n {
            let mut re = 0.0f32;
            let mut im = 0.0f32;
            for (i, &x) in input.iter().enumerate() {
                let angle = -TWO_PI * k as f32 * i as f32 / n as f32;
                re += x * angle.cos();
                im += x * angle.sin();
            }
            output[2 * k] = re;
            output[2 * k + 1] = im;
        }
        output
    }

    /// Compute FFT using a fresh planner each call. Used for benchmarking the
    /// benefits of planner reuse.
    fn fft_real_uncached(input: &[f32]) -> Vec<f32> {
        let n = input.len();
        let mut buffer: Vec<Complex32> = input.iter().map(|&x| Complex32::new(x, 0.0)).collect();
        FftPlanner::<f32>::new()
            .plan_fft_forward(n)
            .process(&mut buffer);
        let mut output = Vec::with_capacity(2 * n);
        for c in buffer {
            output.push(c.re);
            output.push(c.im);
        }
        output
    }

    /// Ensure the optimized FFT matches the reference implementation.
    #[test]
    fn fft_matches_reference() {
        let data: Vec<f32> = (0..16).map(|i| i as f32).collect();
        let expected = reference_fft(&data);
        let result = fft_real(&data);
        for (a, b) in result.iter().zip(expected.iter()) {
            assert!((a - b).abs() < TOLERANCE, "{a} vs {b}");
        }
    }

    /// Verify that the optimized FFT is faster than the naive reference.
    #[test]
    fn fft_is_faster_than_reference() {
        let data: Vec<f32> = (0..PERF_SIZE).map(|i| (i as f32).sin()).collect();
        let start = Instant::now();
        let _ = reference_fft(&data);
        let ref_time = start.elapsed();

        let start = Instant::now();
        let _ = fft_real(&data);
        let opt_time = start.elapsed();

        assert!(
            opt_time < ref_time,
            "optimized {opt_time:?} >= reference {ref_time:?}"
        );
    }

    /// Demonstrate that reusing a planner is faster than creating a new one
    /// for each FFT invocation.
    #[test]
    fn cached_planner_is_faster() {
        let data: Vec<f32> = (0..PERF_SIZE).map(|i| (i as f32).cos()).collect();

        // Warm up both implementations to populate caches.
        let _ = fft_real(&data);
        let _ = fft_real_uncached(&data);

        // Time repeated FFTs using the cached planner.
        let start = Instant::now();
        for _ in 0..BENCH_RUNS {
            std::hint::black_box(fft_real(&data));
        }
        let cached_time = start.elapsed();

        // Time repeated FFTs using a fresh planner each iteration.
        let start = Instant::now();
        for _ in 0..BENCH_RUNS {
            std::hint::black_box(fft_real_uncached(&data));
        }
        let uncached_time = start.elapsed();

        assert!(
            cached_time < uncached_time,
            "cached planner {cached_time:?} >= new planner {uncached_time:?}"
        );
    }
}
