export interface Renderer {
  /** Prepare WebGL resources for rendering. */
  init(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void;
  /** Resize the renderer to the specified dimensions. */
  resize(width: number, height: number): void;
  /** Render a frame using the current data. */
  render(): void;
  /** Release any allocated resources. */
  dispose(): void;
}

/**
 * Convenience abstract class providing basic lifecycle management.
 * Specific view modes should extend this and override `render`.
 */
export abstract class BaseRenderer implements Renderer {
  protected gl: WebGL2RenderingContext | null = null;
  protected canvas: HTMLCanvasElement | null = null;

  init(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
    this.gl = gl;
    this.canvas = canvas;
  }

  resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  render(): void {}

  dispose(): void {
    this.gl = null;
    this.canvas = null;
  }
}
