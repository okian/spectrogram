export type FrameBins = Float32Array | Uint16Array | Uint8Array;

/**
 * Circular buffer storing a rolling window of FFT frames for one channel.
 */
export class CoreBuffer {
  private rows: FrameBins[] = [];
  constructor(private maxRows: number) {}

  /** Add a row to the buffer, evicting the oldest when capacity is exceeded. */
  push(row: FrameBins): void {
    this.rows.push(row);
    if (this.rows.length > this.maxRows) {
      this.rows.shift();
    }
  }

  /** Remove all buffered rows. */
  clear(): void {
    this.rows = [];
  }

  /** Current number of buffered rows. */
  get length(): number {
    return this.rows.length;
  }

  /** Get snapshot of rows. */
  getRows(): FrameBins[] {
    return [...this.rows];
  }
}
