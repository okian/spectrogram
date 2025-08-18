import {
  PolarRenderer,
  BarsRenderer,
  RidgeRenderer,
  WaveformRenderer,
  MelRenderer,
  ChromaRenderer,
} from '../src/renderers';

test('placeholder renderers instantiate', () => {
  expect(new PolarRenderer()).toBeInstanceOf(PolarRenderer);
  expect(new BarsRenderer()).toBeInstanceOf(BarsRenderer);
  expect(new RidgeRenderer()).toBeInstanceOf(RidgeRenderer);
  expect(new WaveformRenderer()).toBeInstanceOf(WaveformRenderer);
  expect(new MelRenderer()).toBeInstanceOf(MelRenderer);
  expect(new ChromaRenderer()).toBeInstanceOf(ChromaRenderer);
});
