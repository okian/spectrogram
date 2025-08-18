import {
  SpectroConfig,
  SpectroMeta,
  DEFAULT_SPECTRO_CONFIG,
  DEFAULT_SPECTRO_META,
} from '../index';

/**
 * Tracks configuration and metadata and derives rendering parameters.
 */
export class Controller {
  private config: SpectroConfig = { ...DEFAULT_SPECTRO_CONFIG };
  private meta: SpectroMeta = { ...DEFAULT_SPECTRO_META };

  constructor(initial?: SpectroConfig) {
    if (initial) this.setConfig(initial);
  }

  setConfig(next: Partial<SpectroConfig>): void {
    this.config = { ...this.config, ...next };
  }

  setMeta(meta: SpectroMeta): void {
    this.meta = { ...DEFAULT_SPECTRO_META, ...meta };
  }

  getConfig(): SpectroConfig {
    return { ...this.config };
  }

  getMeta(): SpectroMeta {
    return { ...this.meta };
  }

  /** Compute maximum rows permitted based on time window and hop size. */
  get maxRows(): number {
    const hopSeconds = this.meta.hopSize / this.meta.sampleRateHz;
    const timeWindow =
      this.config.timeWindowSec ?? DEFAULT_SPECTRO_CONFIG.timeWindowSec!;
    const rows = Math.ceil(timeWindow / hopSeconds);
    const maxRows = this.config.maxRows ?? rows;
    return maxRows;
  }
}
