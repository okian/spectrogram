import { SpectroConfig, SpectroMeta } from '../index';

/**
 * Tracks configuration and metadata and derives rendering parameters.
 */
export class Controller {
  private config: SpectroConfig = {};
  private meta: SpectroMeta | null = null;

  constructor(initial?: SpectroConfig) {
    if (initial) this.config = { ...initial };
  }

  setConfig(next: Partial<SpectroConfig>): void {
    this.config = { ...this.config, ...next };
  }

  setMeta(meta: SpectroMeta): void {
    this.meta = meta;
  }

  /** Compute maximum rows permitted based on time window and hop size. */
  get maxRows(): number {
    if (!this.meta) return this.config.maxRows ?? 0;
    const hopSeconds = this.meta.hopSize / this.meta.sampleRateHz;
    const timeWindow = this.config.timeWindowSec ?? 15;
    const rows = Math.ceil(timeWindow / hopSeconds);
    const maxRows = this.config.maxRows ?? rows;
    return maxRows;
  }
}
