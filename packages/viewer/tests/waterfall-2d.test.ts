import { WaterfallRenderer } from '../src/renderers';

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
    createTexture: jest.fn(() => ({})),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    texSubImage2D: jest.fn(),
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
    deleteTexture: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext;
}

test('waterfall renderer stacks rows', () => {
  const gl = createMockGL();
  const canvas = { width: 4, height: 4 } as HTMLCanvasElement;
  const renderer = new WaterfallRenderer({
    palette: new Uint8Array(4),
    maxRows: 2,
  });
  renderer.init(gl, canvas);
  const row1 = new Uint8Array([1, 2, 3, 4]);
  renderer.update(row1, 4);
  expect(gl.texImage2D).toHaveBeenCalledWith(
    gl.TEXTURE_2D,
    0,
    gl.R8,
    4,
    2,
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    expect.any(Uint8Array),
  );
  const row2 = new Uint8Array([5, 6, 7, 8]);
  renderer.update(row2, 4);
  expect(gl.texSubImage2D).toHaveBeenCalledWith(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    4,
    2,
    gl.RED,
    gl.UNSIGNED_BYTE,
    expect.any(Uint8Array),
  );
  renderer.render();
  expect(gl.drawArrays).toHaveBeenCalled();
  renderer.dispose();
  expect(gl.deleteTexture).toHaveBeenCalled();
});
