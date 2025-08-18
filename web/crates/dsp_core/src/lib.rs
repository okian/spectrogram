use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// Set panic hook for better error messages in wasm
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
	console_error_panic_hook::set_once();
}

/// Compute real-to-complex FFT using a working implementation.
/// What: Returns [re0, im0, re1, im1, ...] for efficient GPU texture upload.
/// Why: Provides working FFT while we optimize with kofft SIMD later.
#[wasm_bindgen]
pub fn fft_real(input: &[f32]) -> Vec<f32> {
	let n = input.len();
	if n == 0 { return vec![]; }
	
	// Use a simple FFT implementation for now
	let mut output = vec![0.0f32; 2 * n];
	
	// For each frequency bin
	for k in 0..n {
		let mut re = 0.0f32;
		let mut im = 0.0f32;
		
		// Sum over all time samples
		for (i, &x) in input.iter().enumerate() {
			let angle = -2.0 * PI * k as f32 * i as f32 / n as f32;
			re += x * angle.cos();
			im += x * angle.sin();
		}
		
		output[2 * k] = re;
		output[2 * k + 1] = im;
	}
	
	output
}

/// Apply window function to input buffer. What: Multiplies input by window coefficients.
/// Why: Reduces spectral leakage in FFT analysis.
#[wasm_bindgen]
pub fn apply_window(input: &[f32], window_type: &str) -> Vec<f32> {
	let n = input.len();
	let mut output = vec![0.0f32; n];
	match window_type {
		"hann" => {
			for (i, &x) in input.iter().enumerate() {
				let w = 0.5 * (1.0 - (2.0 * PI * i as f32 / (n as f32 - 1.0)).cos());
				output[i] = x * w;
			}
		}
		"hamming" => {
			for (i, &x) in input.iter().enumerate() {
				let w = 0.54 - 0.46 * (2.0 * PI * i as f32 / (n as f32 - 1.0)).cos();
				output[i] = x * w;
			}
		}
		"blackman" => {
			for (i, &x) in input.iter().enumerate() {
				let w = 0.42 - 0.5 * (2.0 * PI * i as f32 / (n as f32 - 1.0)).cos() + 0.08 * (4.0 * PI * i as f32 / (n as f32 - 1.0)).cos();
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
	let spec = fft_real(input);
	let mut mags = Vec::with_capacity(spec.len() / 2);
	let mut i = 0usize;
	let safe_ref = reference.max(1e-12);
	while i + 1 < spec.len() {
		let re = spec[i];
		let im = spec[i + 1];
		let mag = (re * re + im * im).sqrt();
		let db = 20.0 * (mag / safe_ref).log10();
		mags.push(db);
		i += 2;
	}
	mags
}


