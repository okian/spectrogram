import { describe, it, expect } from 'vitest';
import { CoreBuffer } from '../src/core';

describe('CoreBuffer', () => {
  it('evicts old rows beyond capacity', () => {
    const buf = new CoreBuffer(2);
    buf.push(new Float32Array([1]));
    buf.push(new Float32Array([2]));
    buf.push(new Float32Array([3]));
    expect(buf.length).toBe(2);
    expect(buf.getRows()[0][0]).toBe(2);
    buf.clear();
    expect(buf.length).toBe(0);
  });
});
