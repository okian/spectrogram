/**
 * GPU ring buffer for spectrogram data management.
 * What: Manages a circular buffer of spectrogram rows in GPU memory.
 * Why: Enables efficient streaming updates without reallocating textures.
 */

import * as THREE from 'three';

/** Maximum value of an unsigned 8-bit integer for normalization. */
const UINT8_MAX = 255;
/** Maximum value of an unsigned 16-bit integer for normalization. */
const UINT16_MAX = 65535;

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
  private data: Float32Array;
  private writeRow = 0;
  private rowCount = 0;
  private config: RingBufferConfig;
  /** Scratch buffer reused for integer-to-float conversion. */
  private scratch: Float32Array;

  constructor(gl: WebGLRenderingContext, config: RingBufferConfig) {
    this.gl = gl;
    this.config = config;
    
    // Allocate data buffer and scratch space
    this.data = new Float32Array(config.binCount * config.maxRows);
    this.scratch = new Float32Array(config.binCount);
    
    // Create GPU texture
    this.texture = new THREE.DataTexture(
      this.data,
      config.binCount,
      config.maxRows,
      THREE.RedFormat,
      THREE.FloatType
    );
    
    this.texture.generateMipmaps = false;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.magFilter = config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    this.texture.minFilter = config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    this.texture.needsUpdate = true;
  }

  /**
   * Add a new row of spectrogram data.
   * What: Updates the ring buffer with new frequency data.
   * Why: Enables continuous streaming without memory reallocation.
   */
  pushRow(bins: Float32Array | Uint16Array | Uint8Array): void {
    const { binCount, maxRows } = this.config;

    if (bins.length !== binCount) {
      throw new Error(`Expected ${binCount} bins, received ${bins.length}`);
    }

    // Convert to float32 if needed without allocating each call
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

    // Copy data to ring buffer
    const offset = this.writeRow * binCount;
    this.data.set(floatBins, offset);
    
    // Update write position
    this.writeRow = (this.writeRow + 1) % maxRows;
    this.rowCount = Math.min(this.rowCount + 1, maxRows);
    
    // Update GPU texture
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
    
    // Reallocate data buffer and scratch space
    this.data = new Float32Array(binCount * maxRows);
    this.scratch = new Float32Array(binCount);
    
    // Recreate GPU texture
    this.texture.dispose();
    this.texture = new THREE.DataTexture(
      this.data,
      binCount,
      maxRows,
      THREE.RedFormat,
      THREE.FloatType
    );
    
    this.texture.generateMipmaps = false;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.magFilter = this.config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    this.texture.minFilter = this.config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    this.texture.needsUpdate = true;
    
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
