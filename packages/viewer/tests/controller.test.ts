import { Controller } from '../src/core';
import {
  SpectroMeta,
  DEFAULT_SPECTRO_CONFIG,
  DEFAULT_SPECTRO_META,
} from '../src';

describe('Controller', () => {
  test('derives maxRows from config and meta', () => {
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

  test('provides default config and meta', () => {
    const c = new Controller();
    expect(c.getConfig()).toMatchObject({
      timeWindowSec: DEFAULT_SPECTRO_CONFIG.timeWindowSec,
      dbFloor: DEFAULT_SPECTRO_CONFIG.dbFloor,
      dbCeiling: DEFAULT_SPECTRO_CONFIG.dbCeiling,
      freqScale: DEFAULT_SPECTRO_CONFIG.freqScale,
      palette: DEFAULT_SPECTRO_CONFIG.palette,
    });
    expect(c.getMeta()).toMatchObject({
      nfft: DEFAULT_SPECTRO_META.nfft,
      hopSize: DEFAULT_SPECTRO_META.hopSize,
      window: DEFAULT_SPECTRO_META.window,
    });
  });

  test('allows overriding defaults', () => {
    const c = new Controller();
    c.setConfig({
      palette: 'turbo',
      freqScale: 'linear',
      dbFloor: -80,
      dbCeiling: -10,
      timeWindowSec: 10,
    });
    expect(c.getConfig()).toMatchObject({
      palette: 'turbo',
      freqScale: 'linear',
      dbFloor: -80,
      dbCeiling: -10,
      timeWindowSec: 10,
    });
  });

  test('computes maxRows from default settings', () => {
    const c = new Controller();
    const expected = Math.ceil(
      DEFAULT_SPECTRO_CONFIG.timeWindowSec! /
        (DEFAULT_SPECTRO_META.hopSize / DEFAULT_SPECTRO_META.sampleRateHz),
    );
    expect(c.maxRows).toBe(expected);
  });
});
