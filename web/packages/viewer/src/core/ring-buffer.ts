/**
 * GPU ring buffer for spectrogram data management.
 * What: Maintains a circular buffer of spectrogram rows in CPU and GPU memory.
 * Why: Enables efficient streaming without reallocating textures.
 */

import * as THREE from 'three';

/**
 * Mapping from configuration format to THREE.js texture data type.
 * What: Associates each supported sample format with the corresponding WebGL texture type.
 * Why: Guarantees textures are created with correct precision to match CPU data.
 */
const TEXTURE_TYPE_BY_FORMAT: Record<RingBufferConfig['format'], THREE.TextureDataType> = {
  R32F: THREE.FloatType,
  R16F: THREE.HalfFloatType,
  UNORM8: THREE.UnsignedByteType
};
/** Maximum value of an unsigned 8-bit integer for normalization. */
const UINT8_MAX = 255;
/** Maximum value of an unsigned 16-bit integer for normalization. */
const UINT16_MAX = 65535;

/** Configuration describing ring buffer behaviour. */
export interface RingBufferConfig {
  /** Number of frequency bins per row. */
  binCount: number;
  /** Maximum number of time rows to store. */
  maxRows: number;
  /** Data format for GPU texture. */
  format: 'R32F' | 'R16F' | 'UNORM8';
  /** Whether to enable linear filtering. */
  linearFilter: boolean;
}

/**
 * GPU ring buffer for spectrogram data.
 * What: Streams spectrogram rows into a persistent texture.
 * Why: Avoids per-frame allocations and minimizes memory copies.
 */
export class SpectroRingBuffer {
  private gl: WebGLRenderingContext;
  private texture: THREE.DataTexture;
  private data: Float32Array | Uint8Array;
  /** Scratch buffer reused for numeric conversion to avoid allocations. */
  private scratch: Float32Array;
  /** Index of next row to write. */
  private writeRow = 0;
  /** Number of rows currently populated. */
  private rowCount = 0;
  private config: RingBufferConfig;

  /**
   * Initialize the ring buffer and underlying texture.
   */
  constructor(gl: WebGLRenderingContext, config: RingBufferConfig) {
    this.gl = gl;
    this.config = { ...config };
    const { binCount, maxRows } = this.config;
    this.data = this.createDataArray(binCount * maxRows);
    this.scratch = new Float32Array(binCount);
    this.texture = this.createTexture(this.data, binCount, maxRows);
  }

  /**
   * Allocate CPU storage matching the configured texture format.
   */
  private createDataArray(size: number): Float32Array | Uint8Array {
    return this.config.format === 'UNORM8' ? new Uint8Array(size) : new Float32Array(size);
  }

  /**
   * Construct a THREE.js DataTexture with proper parameters.
   */
  private createTexture(
    data: Float32Array | Uint8Array,
    width: number,
    height: number
  ): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RedFormat,
      TEXTURE_TYPE_BY_FORMAT[this.config.format]
    );
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = this.config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    texture.minFilter = this.config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Push a row of bins into the ring buffer.
   * How: Validates size and converts input to the underlying storage format.
   */
  pushRow(bins: Float32Array | Uint16Array | Uint8Array): void {
    const { binCount, maxRows, format } = this.config;

    if (bins.length !== binCount) {
      throw new Error(`Expected ${binCount} bins, received ${bins.length}.`);
    }

    // Prepare float representation regardless of input type.
    /** Temporary float view of incoming bins. */
    let floatBins: Float32Array;
    if (bins instanceof Float32Array) {
      floatBins = bins;
    } else if (bins instanceof Uint16Array) {
      for (let i = 0; i < binCount; i++) {
        this.scratch[i] = bins[i] / UINT16_MAX;
      }
      floatBins = this.scratch;
    } else {
      for (let i = 0; i < binCount; i++) {
        this.scratch[i] = bins[i] / UINT8_MAX;
      }
      floatBins = this.scratch;
    }

    // Write data into backing array without extra allocations.
    const offset = this.writeRow * binCount;
    if (this.data instanceof Float32Array) {
      this.data.set(floatBins, offset);
    } else if (this.data instanceof Uint8Array) {
      for (let i = 0; i < binCount; i++) {
        this.data[offset + i] = Math.round(floatBins[i] * UINT8_MAX);
      }
    }

    this.writeRow = (this.writeRow + 1) % maxRows;
    this.rowCount = Math.min(this.rowCount + 1, maxRows);
    this.texture.needsUpdate = true;
  }

  /**
   * Clear all stored rows.
   */
  clear(): void {
    this.data.fill(0);
    this.writeRow = 0;
    this.rowCount = 0;
    this.texture.needsUpdate = true;
  }

  /**
   * Retrieve underlying GPU texture for rendering.
   */
  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  /**
   * Report current buffer statistics for monitoring.
   */
  getStats(): { rowCount: number; writeRow: number; maxRows: number; binCount: number } {
    return {
      rowCount: this.rowCount,
      writeRow: this.writeRow,
      maxRows: this.config.maxRows,
      binCount: this.config.binCount
    };
  }

  /**
   * Resize buffer dimensions and recreate texture.
   */
  resize(binCount: number, maxRows: number): void {
    if (binCount === this.config.binCount && maxRows === this.config.maxRows) {
      return;
    }
    this.data = this.createDataArray(binCount * maxRows);
    this.scratch = new Float32Array(binCount);
    this.texture.dispose();
    this.texture = this.createTexture(this.data, binCount, maxRows);
    this.config.binCount = binCount;
    this.config.maxRows = maxRows;
    this.writeRow = 0;
    this.rowCount = 0;
  }

  /**
   * Release GPU resources held by this buffer.
   */
  dispose(): void {
    this.texture.dispose();
  }
}
