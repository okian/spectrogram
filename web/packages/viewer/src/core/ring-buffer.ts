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
  UNORM8: THREE.UnsignedByteType,
};

/** Maximum value of an unsigned 8-bit integer for normalization. */
const UINT8_MAX = 255;
/** Maximum unsigned 16-bit integer value for normalization. */
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
  /** WebGL context used for capability checks. */
  private gl: WebGLRenderingContext;
  /** Texture holding spectrogram data on the GPU. */
  private texture: THREE.DataTexture;
  /** CPU-side data buffer. */
  private data: Float32Array | Uint8Array;
  /** Scratch buffer reused for numeric conversion to avoid allocations. */
  private scratch: Float32Array;
  /** Index of next row to write. */
  private writeRow = 0;
  /** Number of rows currently stored. */
  private rowCount = 0;
  /** Configuration used to construct the buffer. */
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

    this.data = this.createDataArray(config.binCount * config.maxRows);
    // Prepare scratch space once to avoid per-call allocations.
    this.scratch = new Float32Array(config.binCount);
    this.verifyFloatTextureSupport();

    this.texture = this.createTexture(this.data, config.binCount, config.maxRows);
  }

  /**
   * Ensure the WebGL context supports the requested texture format.
   * What: Validates float texture and filtering support for WebGL1/2.
   * Why: Avoids runtime GPU errors by failing fast when unsupported.
   */
  private verifyFloatTextureSupport(): void {
    const { format, linearFilter } = this.config;
    if (format === 'UNORM8') {
      return; // Byte textures are universally supported.
    }

    const gl = this.gl;
    const isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' &&
      gl instanceof WebGL2RenderingContext;

    if (isWebGL2) {
      return;
    }

    const floatExt = format === 'R32F' ? 'OES_texture_float' : 'OES_texture_half_float';
    if (gl.getExtension(floatExt) === null) {
      throw new Error(`${format} textures require WebGL2 or extension ${floatExt}.`);
    }

    if (linearFilter) {
      const filterExt =
        format === 'R32F'
          ? 'OES_texture_float_linear'
          : 'OES_texture_half_float_linear';
      if (gl.getExtension(filterExt) === null) {
        throw new Error(`Linear filtering for ${format} textures requires extension ${filterExt}.`);
      }
    }
  }

  /**
   * Create a typed array sized for the ring buffer.
   * @param size - Total number of elements required.
   * @returns Float32Array or Uint8Array matching configured format.
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
      data as unknown as ArrayBufferView,
      width,
      height,
      THREE.RedFormat,
      TEXTURE_TYPE_BY_FORMAT[this.config.format]
    );
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const filter = this.config.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
    texture.magFilter = filter;
    texture.minFilter = filter;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Push a row of bins into the ring buffer.
   * How: Validates size and converts input to the underlying storage format.
   * Expose the internal texture for rendering.
   */
  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  /**
   * Add a new row of spectrogram data.
   * @param bins - Frequency data for one time slice.
   */
  pushRow(bins: Float32Array | Uint16Array | Uint8Array): void {
    const { binCount, maxRows, format } = this.config;

    if (bins.length !== binCount) {
      throw new Error(`Expected ${binCount} bins, received ${bins.length}.`);
    }

    // Prepare float representation regardless of input type.
    /** Temporary float view of incoming bins. */
    // Ensure provided array matches the configured texture format.
    if (format === 'UNORM8' && !(bins instanceof Uint8Array)) {
      throw new Error('UNORM8 format requires Uint8Array input.');
    }
    if (format !== 'UNORM8' && !(bins instanceof Float32Array)) {
      throw new Error(`${format} format requires Float32Array input.`);
    }

    // Convert to float32 if needed without allocating each call.
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


    // Upload the row to GPU texture.
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      this.writeRow,
      binCount,
      1,
      gl.RED,
      TEXTURE_TYPE_BY_FORMAT[format],
      floatBins
    );
    // Copy data to ring buffer.
    const offset = this.writeRow * binCount;
    if (this.data instanceof Float32Array && floatBins instanceof Float32Array) {
      this.data.set(floatBins, offset);
    } else if (this.data instanceof Uint8Array && bins instanceof Uint8Array) {
      this.data.set(bins, offset);
    } else {
      throw new Error('Type mismatch between ring buffer storage and input data.');
    }

    // Advance write pointer and row count.
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
      return; // No change needed.
    }
    this.data = this.createDataArray(binCount * maxRows);
    this.scratch = new Float32Array(binCount);
    this.texture.dispose();
    this.texture = this.createTexture(this.data, binCount, maxRows);

    // Update config and reset state.
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

