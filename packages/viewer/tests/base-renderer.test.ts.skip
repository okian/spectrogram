/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { BaseRenderer } from '../src/renderers';

class DummyRenderer extends BaseRenderer {
  public rendered = false;
  render(): void {
    this.rendered = true;
  }
}

describe('BaseRenderer', () => {
  it('manages lifecycle', () => {
    const r = new DummyRenderer();
    // resize before init should do nothing
    r.resize(10, 5);

    const canvas = document.createElement('canvas');
    const gl = {} as unknown as WebGL2RenderingContext;

    r.init(gl, canvas);
    r.resize(20, 10);
    expect(canvas.width).toBe(20);
    expect(canvas.height).toBe(10);

    r.render();
    expect(r.rendered).toBe(true);

    r.dispose();
    // resize after dispose should not modify canvas
    r.resize(30, 15);
    expect(canvas.width).toBe(20);
    expect(canvas.height).toBe(10);
  });
});
