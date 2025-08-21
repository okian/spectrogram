/**
 * GPU ring buffer for spectrogram data management.
 * What: Maintains a circular buffer of spectrogram rows in CPU and GPU memory.
 * Why: Enables efficient streaming without reallocating textures.
 */
import * as THREE from 'three';

/** Mapping from configuration format to THREE.js texture data type. */
const TEXTURE_TYPE_BY_FORMAT: Record<RingBufferConfig['format'], THREE.TextureDataType> = {
  R32F: THREE.FloatType,
  R16F: THREE.HalfFloatType,
  UNORM8: THREE.UnsignedByteType,
};

/** Maximum value of an unsigned 8-bit integer for normalization. */
const UINT8_MAX = 255;
/** Maximum value of an unsigned 16-bit integer for normalization. */
const UINT16_MAX = 65535;
/** Minimum permissible value for dimensional parameters to prevent empty buffers. */
const MIN_DIMENSION = 1;

/** Configuration describing ring buffer behaviour. */
export interface RingBufferConfig {
  /** Number of frequency bins per row. */
  binCount: number;
  /** Maximum number of time rows to retain. */
  maxRows: number;
  /** WebGL texture storage format. */
  format: 'R32F' | 'R16F' | 'UNORM8';
  /** Whether textures should use linear filtering. */
  linearFilter: boolean;
}

/**
 * GPU ring buffer for spectrogram data.
 * What: Streams spectrogram rows into a persistent texture.
 * Why: Avoids per-frame allocations and minimizes memory copies.
 */
export class SpectroRingBuffer {
  /** WebGL context used to upload rows. */
  private readonly gl: WebGLRenderingContext;
  /** Texture backing the spectrogram data on the GPU. */
  private texture: THREE.DataTexture;
  /** CPU mirror of the GPU texture. */
  private data: Float32Array | Uint8Array;
  /** Scratch space for numeric conversion to avoid per-call allocations. */
  private scratch: Float32Array;
  /** Index of the next row to be written. */
  private writeRow = 0;
  /** Number of rows currently stored in the buffer. */
  private rowCount = 0;
  /** Snapshot of configuration for later reference. */
  private config: RingBufferConfig;

  /**
   * Construct a ring buffer bound to a WebGL context.
   * @param gl - Rendering context used for uploads.
   * @param config - Behavioural configuration where {@link RingBufferConfig.binCount} and
   * {@link RingBufferConfig.maxRows} must be finite positive integers.
   */
  constructor(gl: WebGLRenderingContext, config: RingBufferConfig) {
    this.gl = gl;
    this.config = { ...config };
    this.verifyFloatTextureSupport();

    const { binCount, maxRows } = this.config;
    this.validateDimensions(binCount, maxRows);
    this.data = this.createDataArray(binCount * maxRows);
    this.scratch = new Float32Array(binCount);
    this.texture = this.createTexture(this.data, binCount, maxRows);
  }

  /**
   * Fail fast if the WebGL context lacks required float texture support.
   * Byte textures need no validation.
   */
  private verifyFloatTextureSupport(): void {
    const { format, linearFilter } = this.config;
    if (format === 'UNORM8') {
      return;
    }

    const gl = this.gl;
    const isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    if (isWebGL2) {
      return;
    }

    const floatExt = format === 'R32F' ? 'OES_texture_float' : 'OES_texture_half_float';
    if (gl.getExtension(floatExt) === null) {
      throw new Error(`${format} textures require WebGL2 or extension ${floatExt}.`);
    }

    if (linearFilter) {
      const filterExt =
        format === 'R32F' ? 'OES_texture_float_linear' : 'OES_texture_half_float_linear';
      if (gl.getExtension(filterExt) === null) {
        throw new Error(`Linear filtering for ${format} textures requires extension ${filterExt}.`);
      }
    }
  }

  /**
   * Allocate a typed array matching the configured texture format.
   * @param size - Element count for the array.
   */
  private createDataArray(size: number): Float32Array | Uint8Array {
    return this.config.format === 'UNORM8' ? new Uint8Array(size) : new Float32Array(size);
  }

  /**
   * Construct a THREE.js DataTexture with the correct parameters.
   * @param data - Backing CPU array.
   * @param width - Number of frequency bins.
   * @param height - Number of rows.
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
   * Ensure provided dimensions are finite positive integers.
   * @param binCount - Desired number of frequency bins per row.
   * @param maxRows - Desired number of rows to allocate.
   * @throws When either dimension is non-integer, non-finite, or below {@link MIN_DIMENSION}.
   */
  private validateDimensions(binCount: number, maxRows: number): void {
    if (!Number.isFinite(binCount) || !Number.isInteger(binCount) || binCount < MIN_DIMENSION) {
      throw new Error('binCount must be a finite positive integer.');
    }
    if (!Number.isFinite(maxRows) || !Number.isInteger(maxRows) || maxRows < MIN_DIMENSION) {
      throw new Error('maxRows must be a finite positive integer.');
    }
  }

  /**
   * Push a single row of frequency bins into the buffer.
   * @param bins - Normalised frequency magnitudes.
   */
  pushRow(bins: Float32Array | Uint16Array | Uint8Array): void {
    const { binCount, maxRows, format } = this.config;
    if (bins.length !== binCount) {
      throw new Error(`Expected ${binCount} bins, received ${bins.length}.`);
    }

    const offset = this.writeRow * binCount;
    let uploadData: ArrayBufferView;

    if (format === 'UNORM8') {
      if (!(bins instanceof Uint8Array)) {
        throw new Error('UNORM8 format requires Uint8Array input.');
      }
      (this.data as Uint8Array).set(bins, offset);
      uploadData = bins;
    } else {
      let floats: Float32Array;
      if (bins instanceof Float32Array) {
        floats = bins;
      } else if (bins instanceof Uint16Array) {
        for (let i = 0; i < binCount; i++) {
          this.scratch[i] = bins[i] / UINT16_MAX;
        }
        floats = this.scratch;
      } else if (bins instanceof Uint8Array) {
        for (let i = 0; i < binCount; i++) {
          this.scratch[i] = bins[i] / UINT8_MAX;
        }
        floats = this.scratch;
      } else {
        throw new Error('Unsupported array type for pushRow.');
      }
      (this.data as Float32Array).set(floats, offset);
      uploadData = floats;
    }

    const gl = this.gl as WebGLRenderingContext & { RED: number };
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
      uploadData
    );

    this.writeRow = (this.writeRow + 1) % maxRows;
    this.rowCount = Math.min(this.rowCount + 1, maxRows);
    this.texture.needsUpdate = true;
  }

  /**
   * Read a normalised magnitude at the specified row and bin.
   * What: Provides random access to CPU-side data for interaction handlers.
   * Why: Enables features like click/hover to inspect underlying values.
   * How: Computes the absolute index accounting for ring wrap-around and
   * converts the stored value to a float in the range [0,1].
   */
  read(row: number, bin: number): number {
    const { binCount, maxRows, format } = this.config;
    if (row < 0 || row >= this.rowCount) throw new Error('Row out of range');
    if (bin < 0 || bin >= binCount) throw new Error('Bin out of range');
    const baseRow = (this.writeRow - this.rowCount + row + maxRows) % maxRows;
    const index = baseRow * binCount + bin;
    return format === 'UNORM8'
      ? (this.data as Uint8Array)[index] / UINT8_MAX
      : (this.data as Float32Array)[index];
  }

  /** Clear all stored rows and reset write pointers. */
  clear(): void {
    this.data.fill(0);
    this.writeRow = 0;
    this.rowCount = 0;
    this.texture.needsUpdate = true;
  }

  /** Retrieve the GPU texture containing the spectrogram data. */
  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  /** Report current buffer statistics for debugging and tests. */
  getStats(): { rowCount: number; writeRow: number; maxRows: number; binCount: number } {
    return {
      rowCount: this.rowCount,
      writeRow: this.writeRow,
      maxRows: this.config.maxRows,
      binCount: this.config.binCount,
    };
  }

  /**
   * Resize the buffer, discarding existing data.
   * @param binCount - New number of frequency bins; must be a finite positive integer.
   * @param maxRows - New maximum number of rows; must be a finite positive integer.
   * @throws When either parameter fails validation.
   */
  resize(binCount: number, maxRows: number): void {
    if (binCount === this.config.binCount && maxRows === this.config.maxRows) {
      return;
    }
    this.validateDimensions(binCount, maxRows);
    this.data = this.createDataArray(binCount * maxRows);
    this.scratch = new Float32Array(binCount);
    this.texture.dispose();
    this.texture = this.createTexture(this.data, binCount, maxRows);
    this.config.binCount = binCount;
    this.config.maxRows = maxRows;
    this.writeRow = 0;
    this.rowCount = 0;
  }

  /** Release GPU resources held by this buffer. */
  dispose(): void {
    this.texture.dispose();
  }
}

