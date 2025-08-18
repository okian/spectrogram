/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Spectrogram,
  SpectrogramAPI,
  SpectroMeta,
  DEFAULT_SPECTRO_META,
} from '../src';

const baseFrame = {
  channelId: 0,
  frameIndex: 0,
  timestampUs: 0,
  bins: new Float32Array([0]),
};

test('Spectrogram exposes API and updates internal state', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const originalError = console.error;
  console.error = () => {};

  let api: SpectrogramAPI | null = null;
  await act(async () => {
    createRoot(container).render(
      React.createElement(Spectrogram, {
        onReady: (a: SpectrogramAPI) => {
          api = a;
        },
      }),
    );
  });
  expect(api).not.toBeNull();

  const meta: SpectroMeta = { ...DEFAULT_SPECTRO_META, streamId: 's' };

  await act(async () => {
    api!.setConfig({ width: 100, height: 50 });
    api!.setMeta(meta);
    api!.pushFrame(baseFrame);
    api!.pushFrames([{ ...baseFrame, frameIndex: 1 }]);
  });

  const rootDiv = container.firstChild as HTMLDivElement;
  expect(rootDiv.getAttribute('data-frame-count')).toBe('2');

  await act(async () => {
    api!.resize(200, 150);
  });
  expect(rootDiv.getAttribute('data-width')).toBe('200');
  expect(rootDiv.getAttribute('data-height')).toBe('150');

  const canvas = rootDiv.querySelector('canvas') as HTMLCanvasElement;
  canvas.toBlob = (cb) => cb(new Blob(['test']));
  await expect(api!.exportPNG()).resolves.toBeInstanceOf(Blob);

  expect(api!.stats()).toEqual({
    fps: 0,
    dropped: 0,
    rows: 2,
    bins: meta.binCount,
  });

  await act(async () => {
    api!.clear();
  });
  expect(rootDiv.getAttribute('data-frame-count')).toBe('0');
  console.error = originalError;
});
