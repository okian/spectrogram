import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock WASM bindings to avoid requiring compiled artifacts during tests
vi.mock('@spectro/wasm-bindings', () => ({}));

// Polyfill ResizeObserver for @react-three/fiber
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverMock;

// Stub WebGL context to satisfy float texture requirements
class FakeWebGL2Context {
  /** Numeric constant for texture target. */
  TEXTURE_2D = 0;
  /** Numeric constant for red channel format. */
  RED = 0;
  /** No-op bindTexture to satisfy interface. */
  bindTexture(): void {}
  /** No-op texSubImage2D to satisfy interface. */
  texSubImage2D(): void {}
  /** Report presence of any requested extension. */
  getExtension(_name: string): unknown {
    return {};
  }
}
(globalThis as any).WebGL2RenderingContext = FakeWebGL2Context;
/** Track canvas context requests and provide a fake WebGL2 context. */
const getContextStub = vi.fn(() => new FakeWebGL2Context());
(HTMLCanvasElement.prototype as any).getContext = getContextStub;

import { Spectrogram, SpectrogramAPI, SpectroMeta, DEFAULT_BG } from './index';

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

/**
 * Convert a hex color string to an rgb() CSS string.
 * What: Parses a 6-digit hex code into its RGB components.
 * Why: Allows comparison with computed styles which are returned in rgb() form.
 * How: Uses parseInt on substrings to build "rgb(r, g, b)".
 */
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('Spectrogram metadata handling', () => {
  it('resizes ring buffer and updates stats on meta change', async () => {
    let api: SpectrogramAPI | null = null;
    render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} onReady={a => (api = a)} />);

    // Wait for onReady and ring buffer initialization
    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });
    if (!api) throw new Error('API not initialized');
    const apiRef = api;

    const meta = makeMeta();
    act(() => apiRef.setMeta(meta));

    const statsAfterSet = apiRef.stats();
    expect(statsAfterSet.bins).toBe(meta.binCount);
    expect(statsAfterSet.rows).toBe(0);

    const frameBins = new Float32Array(meta.binCount);
    act(() => apiRef.pushFrame({ channelId: 0, frameIndex: 0, timestampUs: 0, bins: frameBins }));
    expect(apiRef.stats().rows).toBe(1);

    const meta2 = makeMeta({ binCount: 128, hopSize: 256 });
    act(() => apiRef.setMeta(meta2));
    expect(apiRef.stats().bins).toBe(meta2.binCount);
    expect(apiRef.stats().rows).toBe(0);
  });

  it('rejects invalid metadata', async () => {
    let api: SpectrogramAPI | null = null;
    render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} onReady={a => (api = a)} />);
    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });
    if (!api) throw new Error('API not initialized');
    const apiRef = api;

    const badMeta = makeMeta({ binCount: 0 });
    expect(() => apiRef.setMeta(badMeta)).toThrow();
  });

  it('rejects frames with mismatched bin counts', async () => {
    let api: SpectrogramAPI | null = null;
    render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} onReady={a => (api = a)} />);
    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });
    if (!api) throw new Error('API not initialized');
    const apiRef = api;

    const meta = makeMeta();
    act(() => apiRef.setMeta(meta));

    const wrongBins = new Float32Array(meta.binCount + 1);
    expect(() => apiRef.pushFrame({ channelId: 0, frameIndex: 0, timestampUs: 0, bins: wrongBins })).toThrow();
  });

  /**
   * Ensures the default background constant is applied when no background is provided.
   * What: Renders the component without specifying a background.
   * Why: Prevents regressions where the constant is not honored.
   * How: Inspects the root div style for DEFAULT_BG.
   */
  it('uses DEFAULT_BG when background omitted', () => {
    const { container } = render(<Spectrogram config={{ showLegend: false, autoGenerate: false }} />);
    const div = container.firstChild as HTMLElement;
    expect(getComputedStyle(div).backgroundColor).toBe(hexToRgb(DEFAULT_BG));
  });
});

/**
 * Regression test ensuring we do not create multiple WebGL contexts.
 * What: Tracks HTMLCanvasElement.getContext invocations.
 * Why: Prevents redundant context allocation which leaks GPU resources.
 */
it('creates WebGL context only once', async () => {
  getContextStub.mockClear();
  render(<Spectrogram config={{ autoGenerate: false, showLegend: false }} />);
  await act(async () => {
    await new Promise(res => setTimeout(res, 0));
  });
  expect(getContextStub.mock.calls.length).toBeLessThanOrEqual(1);
});

/**
 * Ensure click events provide accurate spectrogram coordinates.
 */
it('emits SpectroEvent on click', async () => {
  const handleClick = vi.fn();
  let api: SpectrogramAPI | null = null;
  const { container } = render(
    <Spectrogram
      config={{ autoGenerate: false, showLegend: false }}
      onReady={a => (api = a)}
      onClick={handleClick}
    />
  );
  await act(async () => {
    await new Promise(res => setTimeout(res, 0));
  });
  if (!api) throw new Error('API not initialized');
  const apiRef = api;

  const meta = makeMeta({ binCount: 4, sampleRateHz: 1, hopSize: 1, freqStepHz: 1, scale: 'linear' });
  act(() => apiRef.setMeta(meta));
  const frameBins = new Float32Array([0, 0.25, 0.5, 0.75]);
  act(() => apiRef.pushFrame({ channelId: 0, frameIndex: 0, timestampUs: 0, bins: frameBins }));

  const div = container.firstChild as HTMLElement;
  vi.spyOn(div, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    right: 100,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => {}
  } as DOMRect);

  await act(async () => {
    fireEvent.click(div, { clientX: 50, clientY: 50 });
  });

  expect(handleClick).toHaveBeenCalledTimes(1);
  const payload = handleClick.mock.calls[0][0];
  expect(payload).toMatchObject({ timeSec: 0, row: 0, bin: 2, freqHz: 2 });
  expect(payload.mag).toBeCloseTo(0.5);
});
