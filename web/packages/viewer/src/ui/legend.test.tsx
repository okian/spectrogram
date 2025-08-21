import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Legend } from './legend';

/** Default palette used across tests. */
const TEST_PALETTE = 'viridis';

/**
 * Provide a minimal canvas context stub to satisfy rendering without requiring
 * the optional canvas package in tests.
 */
beforeAll(() => {
  // Silence expected React errors during failed renders
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = () => null as any;
});

describe('Legend dB range validation', () => {
  /**
   * What: Ensure valid dB ranges render without error.
   * Why: Correct ranges should not trigger validation.
   */
  it('renders for valid dB range', () => {
    expect(() =>
      render(<Legend palette={TEST_PALETTE} dbFloor={0} dbCeiling={10} />)
    ).not.toThrow();
  });

  /**
   * What: Verify equal floor and ceiling are rejected.
   * Why: Zero-span ranges make the legend meaningless.
   */
  it('throws for equal dB floor and ceiling', () => {
    expect(() =>
      render(<Legend palette={TEST_PALETTE} dbFloor={5} dbCeiling={5} />)
    ).toThrow(/dbCeiling/);
  });

  /**
   * What: Verify inverted ranges are rejected.
   * Why: Inverted ranges indicate caller bugs and should fail fast.
   */
  it('throws for inverted dB range', () => {
    expect(() =>
      render(<Legend palette={TEST_PALETTE} dbFloor={10} dbCeiling={0} />)
    ).toThrow(/dbCeiling/);
  });
});
