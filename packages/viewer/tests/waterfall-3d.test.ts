import { Waterfall3DRenderer } from '../src/renderers';

function createMockGL(): WebGL2RenderingContext {
  return {
    TRIANGLES: 0x0004,
    LINES: 0x0001,
    TEXTURE_2D: 0x0de1,
    ARRAY_BUFFER: 0x8892,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    createProgram: jest.fn(() => ({})),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    createVertexArray: jest.fn(() => ({})),
    createBuffer: jest.fn(() => ({})),
    bindVertexArray: jest.fn(),
    bindBuffer: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    bufferData: jest.fn(),
    viewport: jest.fn(),
    useProgram: jest.fn(),
    getUniformLocation: jest.fn(() => ({})),
    uniform4f: jest.fn(),
    drawArrays: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteVertexArray: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext;
}

test('3d waterfall renderer draws mesh', () => {
  const gl = createMockGL();
  const canvas = { width: 4, height: 4 } as HTMLCanvasElement;
  const r = new Waterfall3DRenderer({
    maxRows: 2,
    wireframe: true,
    orbitControls: true,
  });
  r.init(gl, canvas);
  const controls = (r as unknown as { controls: { dispose: () => void } })
    .controls;
  expect(controls).not.toBeNull();
  const disposeSpy = jest.spyOn(controls, 'dispose');
  r.update(new Uint8Array([1, 2]), 2);
  expect(gl.bufferData).toHaveBeenCalled();
  r.render();
  expect(gl.drawArrays).toHaveBeenCalledWith(gl.LINES, 0, expect.any(Number));
  r.dispose();
  expect(gl.deleteBuffer).toHaveBeenCalled();
  expect(disposeSpy).toHaveBeenCalled();
});
