import { BaseRenderer } from './base';

/** Options for {@link WaterfallRenderer}. */
export interface WaterfallRendererOptions {
  /** Palette lookup table. */
  palette: Uint8Array;
  /** Number of rows retained in the waterfall texture. */
  maxRows: number;
}

/**
 * CPU-backed 2D waterfall renderer. New rows are appended at the bottom
 * of an internal ring buffer which is uploaded to a single WebGL texture.
 *
 * This implementation favours simplicity over performance and is intended
 * for small demos and tests. Production builds should replace the CPU
 * copy with shader-based scrolling or framebuffer ping-pong.
 */
export class WaterfallRenderer extends BaseRenderer {
  private program: WebGLProgram | null = null;
  private dataTex: WebGLTexture | null = null;
  private paletteTex: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: Uint8Array | null = null;
  private width = 0;

  constructor(private readonly options: WaterfallRendererOptions) {
    super();
  }

  override init(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
    super.init(gl, canvas);
    // compile shaders (reuse same as heatmap)
    const vert = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vert,
      `#version 300 es\nprecision mediump float;\nin vec2 aPos;\nout vec2 vUv;\nvoid main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}`,
    );
    gl.compileShader(vert);

    const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      frag,
      `#version 300 es\nprecision mediump float;\nuniform sampler2D uData;\nuniform sampler2D uPalette;\nin vec2 vUv;\nout vec4 outColor;\nvoid main(){float m=texture(uData,vUv).r;outColor=texture(uPalette,vec2(m,0.5));}`,
    );
    gl.compileShader(frag);

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    this.program = program;

    // allocate textures
    this.dataTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.options.palette.length / 4,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.options.palette,
    );

    // geometry
    this.vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  /** Append a new row to the waterfall. */
  update(row: Uint8Array, width: number): void {
    if (!this.gl) return;
    const gl = this.gl;
    if (!this.buffer || this.width !== width) {
      this.width = width;
      this.buffer = new Uint8Array(width * this.options.maxRows);
      gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R8,
        width,
        this.options.maxRows,
        0,
        gl.RED,
        gl.UNSIGNED_BYTE,
        this.buffer,
      );
    }
    // shift and append
    this.buffer.copyWithin(0, width);
    this.buffer.set(row.slice(0, width), (this.options.maxRows - 1) * width);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      width,
      this.options.maxRows,
      gl.RED,
      gl.UNSIGNED_BYTE,
      this.buffer,
    );
  }

  override render(): void {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uData'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uPalette'), 1);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  override dispose(): void {
    if (!this.gl) return;
    if (this.dataTex) this.gl.deleteTexture(this.dataTex);
    if (this.paletteTex) this.gl.deleteTexture(this.paletteTex);
    if (this.program) this.gl.deleteProgram(this.program);
    this.dataTex = null;
    this.paletteTex = null;
    this.program = null;
    this.buffer = null;
    this.vao = null;
    super.dispose();
  }
}
