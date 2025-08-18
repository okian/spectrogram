import { describe, it, expect } from 'vitest';
import { DataIngest, Controller } from '../src/core';
import { SpectroMeta } from '../src/index';

const baseMeta: SpectroMeta = {
  streamId: 's',
  channels: 2,
  sampleRateHz: 100,
  nfft: 4,
  hopSize: 10,
  binCount: 2,
  freqStartHz: 0,
  freqStepHz: 1,
  scale: 'dbfs',
};

describe('DataIngest', () => {
  it('accepts frames, enforces ordering, and reallocates on meta change', () => {
    const controller = new Controller({ timeWindowSec: 1 });
    const ingest = new DataIngest(controller);
    ingest.setMeta(baseMeta);

    // push in order
    ingest.pushFrame({
      channelId: 0,
      frameIndex: 0,
      timestampUs: 0,
      bins: new Float32Array([0, 1]),
    });
    // duplicate frame ignored
    ingest.pushFrame({
      channelId: 0,
      frameIndex: 0,
      timestampUs: 0,
      bins: new Float32Array([2, 3]),
    });
    // out of order ignored
    ingest.pushFrame({
      channelId: 0,
      frameIndex: -1,
      timestampUs: 0,
      bins: new Float32Array([4, 5]),
    });
    // channel 1
    ingest.pushFrames([
      {
        channelId: 1,
        frameIndex: 0,
        timestampUs: 0,
        bins: new Float32Array([6, 7]),
      },
      {
        channelId: 1,
        frameIndex: 1,
        timestampUs: 0,
        bins: new Float32Array([8, 9]),
      },
    ]);

    expect(ingest.getStats()).toEqual({ frameCount: 3 });
    expect(ingest.getChannelRows(0).length).toBe(1);
    expect(ingest.getChannelRows(1).length).toBe(2);

    // clear and push again
    ingest.clear();
    expect(ingest.getStats()).toEqual({ frameCount: 0 });

    // change meta reducing channels -> buffers reallocated
    ingest.setMeta({ ...baseMeta, channels: 1 });
    ingest.pushFrame({
      channelId: 0,
      frameIndex: 0,
      timestampUs: 0,
      bins: new Float32Array([1, 2]),
    });
    expect(ingest.getChannelRows(0).length).toBe(1);
    expect(ingest.getStats()).toEqual({ frameCount: 1 });
  });
});
