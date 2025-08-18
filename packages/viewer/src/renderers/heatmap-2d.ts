import { BaseRenderer } from './base';

/** Options for {@link HeatmapRenderer}. */
export interface HeatmapRendererOptions {
  /** Lookup table palette as flat RGBA array (length multiple of 4). */
  palette: Uint8Array;
  /** Reverse the palette lookup table. */
  paletteReverse?: boolean;
  /** Optional clear color. */
  background?: [number, number, number, number];
}

/**
 * Simple WebGL2 renderer drawing FFT rows as a 2D heatmap.
 *
 * It uploads incoming magnitude data to a `R8` texture and maps the
 * values through a palette texture. Rendering draws a full-screen quad
 * sampling both textures.
 */
export class HeatmapRenderer extends BaseRenderer {
  private program: WebGLProgram | null = null;
  private dataTex: WebGLTexture | null = null;
  private paletteTex: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private width = 0;
  private height = 0;

  constructor(private readonly options: HeatmapRendererOptions) {
    super();
  }

  /** Initialize GL resources. */
  override init(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
    super.init(gl, canvas);
    // compile shaders
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

    // data texture (updated per-frame)
    this.dataTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // palette texture (1D lookup table)
    this.paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const pal = this.options.paletteReverse
      ? new Uint8Array(this.options.palette).reverse()
      : this.options.palette;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      pal.length / 4,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pal,
    );

    // geometry: two triangles covering clipspace
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

  /** Upload a new magnitude slice. */
  update(data: Uint8Array, width: number, height: number): void {
    if (!this.gl) return;
    this.width = width;
    this.height = height;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.dataTex);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.R8,
      width,
      height,
      0,
      this.gl.RED,
      this.gl.UNSIGNED_BYTE,
      data,
    );
  }

  /** Draw the heatmap. */
  override render(): void {
    if (!this.gl || !this.program || !this.canvas) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (this.options.background) {
      const [r, g, b, a] = this.options.background;
      gl.clearColor(r, g, b, a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
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

  /** Release GL resources. */
  override dispose(): void {
    if (!this.gl) return;
    if (this.dataTex) this.gl.deleteTexture(this.dataTex);
    if (this.paletteTex) this.gl.deleteTexture(this.paletteTex);
    if (this.program) this.gl.deleteProgram(this.program);
    this.dataTex = null;
    this.paletteTex = null;
    this.program = null;
    this.vao = null;
    super.dispose();
  }
}
