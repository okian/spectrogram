import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { Spectrogram, SpectroFrame, SpectrogramAPI } from '../src';

describe('Spectrogram', () => {
  it('exposes API and stores frames', () => {
    let api: SpectrogramAPI | undefined;
    render(<Spectrogram onReady={(a) => (api = a)} />);
    expect(api).toBeDefined();
    const frame: SpectroFrame = {
      channelId: 0,
      frameIndex: 0,
      timestampUs: 0,
      bins: new Float32Array([0]),
    };
    act(() => api!.pushFrame(frame));
    expect(api!.stats().rows).toBe(1);
    act(() => api!.pushFrames([frame, frame]));
    expect(api!.stats().rows).toBe(3);
    act(() => api!.clear());
    expect(api!.stats().rows).toBe(0);
  });

  it('updates config via setConfig', () => {
    let api: SpectrogramAPI | undefined;
    const { getByTestId } = render(
      <Spectrogram
        config={{ width: 100 }}
        data-testid="spec"
        onReady={(a) => (api = a)}
      />,
    );
    const el = getByTestId('spec') as HTMLElement;
    expect(el.style.width).toBe('100px');
    act(() => api!.setConfig({ width: 200 }));
    expect(el.style.width).toBe('200px');
  });
});
