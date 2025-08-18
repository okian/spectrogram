import { HeatmapRenderer } from '../src/renderers';

function createMockGL(): WebGL2RenderingContext {
  return {
    TRIANGLES: 0x0004,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    TEXTURE1: 0x84c1,
    RGBA: 0x1908,
    RED: 0x1903,
    R8: 0x8229,
    UNSIGNED_BYTE: 0x1401,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    NEAREST: 0x2600,
    CLAMP_TO_EDGE: 0x812f,
    COLOR_BUFFER_BIT: 0x4000,
    createTexture: jest.fn(() => ({})),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    createProgram: jest.fn(() => ({})),
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    createVertexArray: jest.fn(() => ({})),
    createBuffer: jest.fn(() => ({})),
    bindVertexArray: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    useProgram: jest.fn(),
    activeTexture: jest.fn(),
    uniform1i: jest.fn(),
    getUniformLocation: jest.fn(() => ({})),
    viewport: jest.fn(),
    drawArrays: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    deleteTexture: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext;
}

test('heatmap options apply', () => {
  const gl = createMockGL();
  const palette = new Uint8Array([0, 0, 0, 0, 255, 255, 255, 255]);
  const canvas = { width: 2, height: 2 } as HTMLCanvasElement;
  const renderer = new HeatmapRenderer({
    palette,
    paletteReverse: true,
    background: [1, 0, 0, 1],
  });
  renderer.init(gl, canvas);
  renderer.update(new Uint8Array(4), 2, 2);
  renderer.render();
  const pal = (gl.texImage2D as jest.Mock).mock.calls[0][8] as Uint8Array;
  expect(pal[0]).toBe(255);
  expect(gl.clearColor).toHaveBeenCalledWith(1, 0, 0, 1);
});
