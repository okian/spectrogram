import { describe, it, expect } from 'vitest';
import { Controller } from '../src/core';
import { SpectroMeta } from '../src/index';

describe('Controller', () => {
  it('derives maxRows from config and meta', () => {
    const c = new Controller({ timeWindowSec: 1 });
    const meta: SpectroMeta = {
      streamId: 's',
      channels: 1,
      sampleRateHz: 100,
      nfft: 4,
      hopSize: 10,
      binCount: 2,
      freqStartHz: 0,
      freqStepHz: 1,
      scale: 'dbfs',
    };
    c.setMeta(meta);
    expect(c.maxRows).toBe(10);
    c.setConfig({ maxRows: 5 });
    expect(c.maxRows).toBe(5);
  });
});
