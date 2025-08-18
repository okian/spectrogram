/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { Spectrogram, SpectrogramAPI, SpectroMeta } from '../src/index';

const baseFrame = {
  channelId: 0,
  frameIndex: 0,
  timestampUs: 0,
  bins: new Float32Array(),
};

describe('Spectrogram', () => {
  it('exposes API, events, and utilities', () => {
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue('data:image/png;base64,abc');

    let api: SpectrogramAPI | null = null;
    const onHover = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      React.createElement(Spectrogram, {
        onReady: (a: SpectrogramAPI) => {
          api = a;
        },
        onHover,
        onClick,
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
      api!.pushFrames([
        { ...baseFrame, frameIndex: 1 },
        { ...baseFrame, frameIndex: 2 },
      ]);
      api!.resize(320, 200);
    });

    expect(api!.getStats()).toEqual({ frameCount: 3 });
    expect(container.firstChild?.getAttribute('data-width')).toBe('320');
    expect(container.firstChild?.getAttribute('data-height')).toBe('200');
    expect(container.firstChild?.getAttribute('data-frame-count')).toBe('3');
    expect(api!.toPng()).toContain('data:image/png');

    fireEvent.mouseMove(container.firstChild as Element);
    fireEvent.click(container.firstChild as Element);
    expect(onHover).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();

    act(() => {
      api!.clear();
    });
    expect(api!.getStats()).toEqual({ frameCount: 0 });
    expect(container.firstChild?.getAttribute('data-frame-count')).toBe('0');
  });
});
