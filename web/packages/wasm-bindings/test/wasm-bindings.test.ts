import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { initWasm, fftReal, applyWindow, stftFrame, magnitudeDbfs } from '../src/index.ts';

// Allow wasm-pack's browser loader to fetch local files in Node.
const realFetch = globalThis.fetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.fetch = (async (input: any, init?: any): Promise<Response> => {
  if (typeof input === 'string' && input.startsWith('file://')) {
    const data = await readFile(fileURLToPath(input));
    return new Response(data, { headers: { 'Content-Type': 'application/wasm' } });
  }
  if (input instanceof URL && input.protocol === 'file:') {
    const data = await readFile(fileURLToPath(input));
    return new Response(data, { headers: { 'Content-Type': 'application/wasm' } });
  }
  return realFetch(input, init);
}) as typeof fetch;

// Utility to create a simple test buffer
function makeInput(): Float32Array {
  return new Float32Array([1, -1, 0.5, -0.5]);
}

test('WASM bindings free memory and validate inputs', async () => {
  const wasm = await initWasm();

  await fftReal(makeInput());
  let baseline = wasm.memory.buffer.byteLength;
  for (let i = 0; i < 50; i++) {
    await fftReal(makeInput());
    assert.equal(wasm.memory.buffer.byteLength, baseline);
  }

  await applyWindow(makeInput(), 'hann');
  baseline = wasm.memory.buffer.byteLength;
  for (let i = 0; i < 50; i++) {
    await applyWindow(makeInput(), 'hann');
    assert.equal(wasm.memory.buffer.byteLength, baseline);
  }

  await stftFrame(makeInput(), 'hann');
  baseline = wasm.memory.buffer.byteLength;
  for (let i = 0; i < 50; i++) {
    await stftFrame(makeInput(), 'hann');
    assert.equal(wasm.memory.buffer.byteLength, baseline);
  }

  await magnitudeDbfs(makeInput());
  baseline = wasm.memory.buffer.byteLength;
  for (let i = 0; i < 50; i++) {
    await magnitudeDbfs(makeInput());
    assert.equal(wasm.memory.buffer.byteLength, baseline);
  }

  await assert.rejects(() => fftReal(new Float32Array([])));
  await assert.rejects(() => applyWindow(new Float32Array([1]), 'bogus' as any));
  await assert.rejects(() => stftFrame(new Float32Array([1]), 'hann', 0));
  await assert.rejects(() => magnitudeDbfs(new Float32Array([1]), -1));
});
