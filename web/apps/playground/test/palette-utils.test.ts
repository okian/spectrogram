import { describe, it, expect } from 'vitest';
import { isPaletteName, PALETTE_OPTIONS } from '../src/palette-utils';

/**
 * Arbitrary invalid palette name used for negative tests.
 */
const INVALID_PALETTE = 'not-a-palette';

describe('isPaletteName', () => {
  it('accepts all declared palette options', () => {
    for (const { value } of PALETTE_OPTIONS) {
      expect(isPaletteName(value)).toBe(true);
    }
  });

  it('rejects unrecognized palette names', () => {
    expect(isPaletteName(INVALID_PALETTE)).toBe(false);
  });
});
