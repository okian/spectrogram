import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import Spectrogram, {
  SpectrogramAPI,
  SpectroFrame,
  SpectroMeta,
} from "./index";

test("spectrogram API stores frames and metadata", async () => {
  let api: SpectrogramAPI | null = null;
  act(() => {
    TestRenderer.create(
      React.createElement(Spectrogram, {
        config: { view: "2d-heatmap" },
        onReady: (a: SpectrogramAPI) => {
          api = a;
        },
      }),
    );
  });
  expect(api).not.toBeNull();

  act(() => {
    const meta: SpectroMeta = {
      streamId: "s",
      channels: 1,
      sampleRateHz: 1,
      nfft: 2,
      hopSize: 1,
      binCount: 2,
      freqStartHz: 0,
      freqStepHz: 1,
      scale: "dbfs",
    };
    api!.setMeta(meta);
  });
  expect(api!.stats().bins).toBe(2);

  const frame: SpectroFrame = {
    channelId: 0,
    frameIndex: 0,
    timestampUs: 0,
    bins: new Float32Array(2),
  };

  act(() => api!.pushFrame(frame));
  expect(api!.stats().rows).toBe(1);

  act(() => api!.pushFrames([frame, frame]));
  expect(api!.stats().rows).toBe(3);

  act(() => api!.clear());
  expect(api!.stats().rows).toBe(0);

  act(() => api!.setConfig({ width: 100 }));
  act(() => api!.resize());
  const blob = await api!.exportPNG();
  expect(blob).toBeInstanceOf(Blob);
});
