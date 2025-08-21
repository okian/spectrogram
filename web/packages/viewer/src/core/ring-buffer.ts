/**
 * GPU ring buffer for spectrogram data management.
 * What: Manages a circular buffer of spectrogram rows in GPU memory.
 * Why: Enables efficient streaming updates without reallocating textures.
 */

import * as THREE from 'three';

/**
 * Mapping from configuration format to THREE.js texture data type.
 * What: Associates each supported sample format with the corresponding WebGL
 * texture data type.
 * Why: Ensures textures are constructed with the correct precision and
 * storage, avoiding GPU/CPU mismatches.
 */
const TEXTURE_TYPE_BY_FORMAT: Record<RingBufferConfig['format'], THREE.TextureDataType> = {
  R32F: THREE.FloatType,
  R16F: THREE.HalfFloatType,
  UNORM8: THREE.UnsignedByteType
};

/** Ring buffer configuration. */
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
 * What: Manages a circular buffer of spectrogram rows in GPU memory.
 * Why: Enables efficient streaming updates without reallocating textures.
 */
export class SpectroRingBuffer {
  private gl: WebGLRenderingContext;
  private texture: THREE.DataTexture;
  private data: Float32Array | Uint8Array;
  private writeRow = 0;
  private rowCount = 0;
  private config: RingBufferConfig;
  /**
   * Initialize the ring buffer.
   * What: Sets up CPU storage and GPU texture based on configuration.
   * Why: Prepares the buffer for streaming spectrogram rows.
   */
  constructor(gl: WebGLRenderingContext, config: RingBufferConfig) {
    this.gl = gl;
    this.config = config;

    // Allocate CPU-side storage tailored to the texture format.
    this.data = this.createDataArray(config.binCount * config.maxRows);

    // Initialize GPU texture with matching type and parameters.
    this.texture = this.createTexture(this.data, config.binCount, config.maxRows);
  }

  /**
   * Create a typed array sized for the ring buffer.
   * What: Allocates either Float32Array or Uint8Array based on configuration.
   * Why: Guarantees CPU memory matches the GPU texture format for efficient
   * uploads and minimal conversion overhead.
   */
  private createDataArray(size: number): Float32Array | Uint8Array {
    return this.config.format === 'UNORM8'
      ? new Uint8Array(size)
      : new Float32Array(size); // For CPU-side storage, both R32F and R16F use Float32Array. (R16F is stored as half-float on the GPU.)
  }

  /**
   * Construct a THREE.js DataTexture for the ring buffer.
   * What: Builds texture with correct dimensions and data type.
   * Why: Encapsulates texture creation to avoid duplicated logic and ensures
   * consistent sampler configuration across resizes.
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
   * Add a new row of spectrogram data.
   * What: Updates the ring buffer with new frequency data.
   * Why: Enables continuous streaming without memory reallocation.
   */
  pushRow(bins: Float32Array | Uint16Array | Uint8Array): void {
    const { binCount, maxRows, format } = this.config;

    // Validate bin count to prevent silent memory corruption.
    if (bins.length !== binCount) {
      throw new Error(`Expected ${binCount} bins, received ${bins.length}.`);
    }

    // Ensure provided array matches the configured texture format.
    if (format === 'UNORM8' && !(bins instanceof Uint8Array)) {
      throw new Error('UNORM8 format requires Uint8Array input.');
    }
    if (format !== 'UNORM8' && !(bins instanceof Float32Array)) {
      throw new Error(`${format} format requires Float32Array input.`);
    }

    // Copy data into the ring buffer storage.
    const offset = this.writeRow * binCount;
    if (this.data instanceof Float32Array && bins instanceof Float32Array) {
      this.data.set(bins, offset);
    } else if (this.data instanceof Uint8Array && bins instanceof Uint8Array) {
      this.data.set(bins, offset);
    } else if (this.data instanceof Uint16Array && bins instanceof Uint16Array) {
      this.data.set(bins, offset);
    } else {
      throw new Error('Type mismatch between ring buffer storage and input data.');
    }

    // Update write position and populated row count.
    this.writeRow = (this.writeRow + 1) % maxRows;
    this.rowCount = Math.min(this.rowCount + 1, maxRows);

    // Mark texture for upload to GPU on next render.
    this.texture.needsUpdate = true;
  }

  /**
   * Clear all data in the ring buffer.
   * What: Resets the buffer to empty state.
   * Why: Allows clean restart of data collection.
   */
  clear(): void {
    this.data.fill(0);
    this.writeRow = 0;
    this.rowCount = 0;
    this.texture.needsUpdate = true;
  }

  /**
   * Get the current GPU texture.
   * What: Returns the WebGL texture for rendering.
   * Why: Enables efficient GPU sampling in shaders.
   */
  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  /**
   * Get current buffer statistics.
   * What: Returns metadata about the buffer state.
   * Why: Enables monitoring and debugging of data flow.
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
   * Resize the ring buffer.
   * What: Changes buffer dimensions and reallocates memory.
   * Why: Allows dynamic adjustment based on performance or requirements.
   */
  resize(binCount: number, maxRows: number): void {
    if (binCount === this.config.binCount && maxRows === this.config.maxRows) {
      return; // No change needed
    }

    // Reallocate CPU buffer and recreate GPU texture.
    this.data = this.createDataArray(binCount * maxRows);
    this.texture.dispose();
    this.texture = this.createTexture(this.data, binCount, maxRows);

    // Update config and reset state
    this.config.binCount = binCount;
    this.config.maxRows = maxRows;
    this.writeRow = 0;
    this.rowCount = 0;
  }

  /**
   * Dispose of GPU resources.
   * What: Cleans up WebGL textures and memory.
   * Why: Prevents memory leaks when component unmounts.
   */
  dispose(): void {
    this.texture.dispose();
  }
}
