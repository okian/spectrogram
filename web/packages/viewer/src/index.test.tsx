import React from 'react';
import { render, act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock WASM bindings to avoid requiring compiled artifacts during tests
vi.mock('@spectro/wasm-bindings', () => ({}), { virtual: true });

// Polyfill ResizeObserver for @react-three/fiber
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverMock;

// Stub canvas context methods required by three.js
(HTMLCanvasElement.prototype as any).getContext = () => ({ getExtension: () => null });

import { Spectrogram, SpectrogramAPI, SpectroMeta } from './index';

/**
 * Utility to create valid metadata for tests.
 * What: Provides a baseline configuration for metadata updates.
 * Why: Avoids repeated literal objects and clarifies intent.
 */
function makeMeta(overrides: Partial<SpectroMeta> = {}): SpectroMeta {
  return {
    streamId: 'test',
    channels: 1,
    sampleRateHz: 48000,
    nfft: 2048,
    hopSize: 512,
    binCount: 256,
    freqStartHz: 0,
    freqStepHz: 10,
    scale: 'dbfs',
    ...overrides,
  };
}

describe('Spectrogram metadata handling', () => {
  it('resizes ring buffer and updates stats on meta change', async () => {
    let api: SpectrogramAPI | null = null;
    render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} onReady={a => (api = a)} />);
    if (!api) throw new Error('API not initialized');

    // Allow effects to create the ring buffer
    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });

    const meta = makeMeta();
    act(() => api!.setMeta(meta));

    const statsAfterSet = api!.stats();
    expect(statsAfterSet.bins).toBe(meta.binCount);
    expect(statsAfterSet.rows).toBe(0);

    const frameBins = new Float32Array(meta.binCount);
    act(() => api!.pushFrame({ channelId: 0, frameIndex: 0, timestampUs: 0, bins: frameBins }));
    expect(api!.stats().rows).toBe(1);

    const meta2 = makeMeta({ binCount: 128, hopSize: 256 });
    act(() => api!.setMeta(meta2));
    expect(api!.stats().bins).toBe(meta2.binCount);
    expect(api!.stats().rows).toBe(0);
  });

  it('rejects invalid metadata', async () => {
    let api: SpectrogramAPI | null = null;
    render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} onReady={a => (api = a)} />);
    if (!api) throw new Error('API not initialized');

    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });

    const badMeta = makeMeta({ binCount: 0 });
    expect(() => api!.setMeta(badMeta)).toThrow();
  });

  it('rejects frames with mismatched bin counts', async () => {
    let api: SpectrogramAPI | null = null;
    render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} onReady={a => (api = a)} />);
    if (!api) throw new Error('API not initialized');

    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });

    const meta = makeMeta();
    act(() => api!.setMeta(meta));

    const wrongBins = new Float32Array(meta.binCount + 1);
    expect(() => api!.pushFrame({ channelId: 0, frameIndex: 0, timestampUs: 0, bins: wrongBins })).toThrow();
  });
});
