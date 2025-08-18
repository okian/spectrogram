/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { Spectrogram, SpectrogramAPI, SpectroMeta } from '../src/index';

const baseFrame = {
  channelId: 0,
  frameIndex: 0,
  timestampUs: 0,
  bins: new Float32Array(),
};

describe('Spectrogram', () => {
  it('exposes API and stores frames', () => {
    let api: SpectrogramAPI | null = null;
    const { container } = render(
      React.createElement(Spectrogram, {
        onReady: (a: SpectrogramAPI) => {
          api = a;
        },
      }),
    );
    expect(api).not.toBeNull();

    act(() => {
      api!.setConfig({ width: 100 });
      api!.setMeta({
        streamId: 's',
        channels: 1,
        sampleRateHz: 1,
        nfft: 1,
        hopSize: 1,
        binCount: 0,
        freqStartHz: 0,
        freqStepHz: 0,
        scale: 'dbfs',
      } as SpectroMeta);
      api!.pushFrame(baseFrame);
    });
    expect(container.firstChild?.getAttribute('data-frame-count')).toBe('1');

    act(() => {
      api!.pushFrames([
        { ...baseFrame, frameIndex: 1 },
        { ...baseFrame, frameIndex: 2 },
      ]);
    });
    expect(container.firstChild?.getAttribute('data-frame-count')).toBe('3');

    act(() => {
      api!.clear();
    });
    expect(container.firstChild?.getAttribute('data-frame-count')).toBe('0');
  });
});
