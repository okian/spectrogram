import { SpectroFrame, SpectroMeta } from '../index';
import { Controller } from './controller';
import { CoreBuffer, FrameBins } from './core-buffer';

/**
 * Accepts frames and metadata updates, maintaining per-channel buffers.
 */
export class DataIngest {
  private buffers: CoreBuffer[] = [];
  private lastFrameIndex: number[] = [];
  private meta: SpectroMeta;

  constructor(private controller: Controller) {
    this.meta = controller.getMeta();
    this.buffers = Array.from(
      { length: this.meta.channels },
      () => new CoreBuffer(this.controller.maxRows),
    );
    this.lastFrameIndex = Array(this.meta.channels).fill(-1);
  }

  setMeta(meta: SpectroMeta): void {
    this.controller.setMeta(meta);
    this.meta = this.controller.getMeta();
    // reallocate buffers per channel
    this.buffers = Array.from(
      { length: this.meta.channels },
      () => new CoreBuffer(this.controller.maxRows),
    );
    this.lastFrameIndex = Array(this.meta.channels).fill(-1);
  }

  pushFrame(frame: SpectroFrame): void {
    if (frame.channelId < 0 || frame.channelId >= this.meta.channels) return;
    const last = this.lastFrameIndex[frame.channelId];
    if (frame.frameIndex <= last) {
      // drop out-of-order or duplicate
      return;
    }
    this.lastFrameIndex[frame.channelId] = frame.frameIndex;
    this.buffers[frame.channelId].push(frame.bins as FrameBins);
  }

  pushFrames(frames: SpectroFrame[]): void {
    for (const f of frames) this.pushFrame(f);
  }

  clear(): void {
    for (const b of this.buffers) b.clear();
    this.lastFrameIndex = this.lastFrameIndex.map(() => -1);
  }

  getStats(): { frameCount: number } {
    const frameCount = this.buffers.reduce((sum, b) => sum + b.length, 0);
    return { frameCount };
  }

  /** Expose buffer rows for a channel (mainly for tests). */
  getChannelRows(channel: number): FrameBins[] {
    return this.buffers[channel]?.getRows() ?? [];
  }
}
