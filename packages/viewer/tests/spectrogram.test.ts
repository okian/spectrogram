import React from 'react';
import TestRenderer from 'react-test-renderer';
import { describe, it, expect } from 'vitest';
import {
  Spectrogram,
  SpectrogramAPI,
  SpectroConfig,
  SpectroFrame,
} from '../src';

describe('Spectrogram component', () => {
  it('exposes API via onReady and handles frames', () => {
    const config: SpectroConfig = { fftSize: 1024 };
    let api: SpectrogramAPI | undefined;

    TestRenderer.act(() => {
      TestRenderer.create(
        React.createElement(Spectrogram, {
          config,
          onReady: (a) => {
            api = a;
          },
        }),
      );
    });

    expect(api).toBeDefined();

    const frame: SpectroFrame = { time: 0, data: new Float32Array() };
    api!.setConfig({ fftSize: 2048 });
    api!.setMeta({ sampleRate: 44100 });
    api!.pushFrame(frame);
    api!.pushFrames([frame]);
    api!.clear();
  });
});
