import { BaseRenderer } from './base';

/** Options for {@link Waterfall3DRenderer}. */
export interface Waterfall3DRendererOptions {
  /** Number of rows retained in the mesh. */
  maxRows: number;
  /** Height scaling applied to magnitudes. */
  heightScale?: number;
  /** Render mesh as wireframe. */
  wireframe?: boolean;
  /** Enable simple orbit controls. */
  orbitControls?: boolean;
}

/**
 * Extremely small 3D waterfall renderer. It generates a heightfield mesh on
 * the CPU and uploads it as a vertex buffer on each update. The implementation
 * is intentionally simple and favours clarity over performance.
 */
export class Waterfall3DRenderer extends BaseRenderer {
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private buffer: Uint8Array | null = null;
  private width = 0;
  private readonly maxRows: number;
  private readonly heightScale: number;
  private readonly wireframe: boolean;
  private readonly orbitControls: boolean;
  private controls: { dispose(): void } | null = null;

  constructor(opts: Waterfall3DRendererOptions) {
    super();
    this.maxRows = opts.maxRows;
    this.heightScale = opts.heightScale ?? 1;
    this.wireframe = opts.wireframe ?? false;
    this.orbitControls = opts.orbitControls ?? false;
  }

  override init(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
    super.init(gl, canvas);
    const vert = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vert,
      `#version 300 es\nprecision mediump float;\nin vec3 aPos;\nvoid main(){gl_Position=vec4(aPos,1.0);}`,
    );
    gl.compileShader(vert);
    const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      frag,
      `#version 300 es\nprecision mediump float;\nuniform vec4 uColor;\nout vec4 outColor;\nvoid main(){outColor=uColor;}`,
    );
    gl.compileShader(frag);
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    this.program = program;
    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    if (this.orbitControls) {
      this.controls = {
        dispose() {
          /* no-op stub */
        },
      };
    }
  }

  /** Append a new row and rebuild mesh. */
  update(row: Uint8Array, width: number): void {
    if (!this.gl) return;
    const gl = this.gl;
    if (!this.buffer || this.width !== width) {
      this.width = width;
      this.buffer = new Uint8Array(width * this.maxRows);
    }
    this.buffer.copyWithin(0, width);
    this.buffer.set(row.slice(0, width), (this.maxRows - 1) * width);
    const verts: number[] = [];
    for (let y = 0; y < this.maxRows - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const i = y * width + x;
        const j = y * width + x + 1;
        const k = (y + 1) * width + x;
        const l = (y + 1) * width + x + 1;
        const xf = (x / (width - 1)) * 2 - 1;
        const yf = (y / (this.maxRows - 1)) * 2 - 1;
        const x1 = ((x + 1) / (width - 1)) * 2 - 1;
        const y1 = ((y + 1) / (this.maxRows - 1)) * 2 - 1;
        const z0 = (this.buffer[i] / 255) * this.heightScale;
        const z1 = (this.buffer[j] / 255) * this.heightScale;
        const z2 = (this.buffer[k] / 255) * this.heightScale;
        const z3 = (this.buffer[l] / 255) * this.heightScale;
        // tri 1
        verts.push(xf, yf, z0, x1, yf, z1, xf, y1, z2);
        // tri 2
        verts.push(x1, yf, z1, x1, y1, z3, xf, y1, z2);
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
    this.vertexCount = verts.length / 3;
  }

  private vertexCount = 0;

  override render(): void {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    gl.useProgram(this.program);
    gl.uniform4f(gl.getUniformLocation(this.program, 'uColor'), 0, 1, 0, 1);
    gl.bindVertexArray(this.vao);
    const mode = this.wireframe ? gl.LINES : gl.TRIANGLES;
    gl.drawArrays(mode, 0, this.vertexCount);
  }

  override dispose(): void {
    if (!this.gl) return;
    if (this.vbo) this.gl.deleteBuffer(this.vbo);
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.controls) this.controls.dispose();
    this.vbo = null;
    this.vao = null;
    this.program = null;
    this.buffer = null;
    super.dispose();
  }
}
