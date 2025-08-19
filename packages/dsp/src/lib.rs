use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fft_real(input: &[f32]) -> Vec<f32> {
    let n = input.len();
    let mut output = vec![0f32; n];
    for k in 0..n {
        let mut sum = 0.0;
        for n1 in 0..n {
            let angle = -2.0 * std::f32::consts::PI * (k as f32) * (n1 as f32) / (n as f32);
            sum += input[n1] * angle.cos();
        }
        output[k] = sum;
    }
    output
}
