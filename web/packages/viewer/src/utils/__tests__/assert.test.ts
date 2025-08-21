/**
 * Unit tests for assertion helpers.
 * What: Verifies that validation utilities accept valid input and reject bad input.
 * Why: Ensures early failure for malformed parameters throughout the codebase.
 */
import { describe, expect, it } from 'vitest';

import {
  assertNonEmptyString,
  assertFiniteNumber,
  assertPositiveFinite,
  assertFiniteAtLeast,
  POSITIVE_MIN
} from '../assert';

/** Lower bound used in tests for assertFiniteAtLeast. */
const TEST_MIN = 5;

describe('assertion helpers', () => {
  it('accepts valid values', () => {
    expect(() => assertNonEmptyString('ok', 'name')).not.toThrow();
    expect(() => assertFiniteNumber(1, 'num')).not.toThrow();
    expect(() => assertPositiveFinite(1, 'pos')).not.toThrow();
    expect(() => assertFiniteAtLeast(TEST_MIN, TEST_MIN, 'min')).not.toThrow();
  });

  it.each([['', 'empty'], [null, 'null'], [undefined, 'undefined']])(
    'assertNonEmptyString rejects %s',
    value => {
      expect(() => assertNonEmptyString(value as any, 's')).toThrow(
        's must be a non-empty string'
      );
    }
  );

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY], [Number.NEGATIVE_INFINITY]])(
    'assertFiniteNumber rejects %s',
    value => {
      expect(() => assertFiniteNumber(value, 'n')).toThrow(
        'n must be a finite number'
      );
    }
  );

  it.each([[0], [-1]])('assertPositiveFinite rejects %s', value => {
    expect(() => assertPositiveFinite(value as any, 'p')).toThrow(
      `p must be > ${POSITIVE_MIN}`
    );
  });

  it('assertPositiveFinite rejects non-finite numbers', () => {
    expect(() => assertPositiveFinite(Number.NaN, 'p')).toThrow(
      'p must be a finite number'
    );
  });

  it('assertFiniteAtLeast enforces inclusive lower bound', () => {
    expect(() => assertFiniteAtLeast(TEST_MIN - 1, TEST_MIN, 'm')).toThrow(
      `m must be >= ${TEST_MIN}`
    );
  });
});
