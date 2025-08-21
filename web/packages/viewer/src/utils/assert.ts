/**
 * Assertion utilities for runtime validation.
 * What: Provides reusable type guards for strings and numbers.
 * Why: Centralizes validation logic and eliminates repeated boilerplate.
 * How: Throws descriptive errors when values violate required constraints.
 */

/** Exclusive lower bound used when checking for positive values. */
const POSITIVE_MIN = 0;

/**
 * Assert that a value is a non-empty string.
 * @param value - Value to validate.
 * @param name - Human-readable parameter name for error messages.
 * @throws {Error} If the value is not a non-empty string.
 */
export function assertNonEmptyString(
  value: unknown,
  name: string
): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

/**
 * Assert that a value is a finite number.
 * @param value - Value to validate.
 * @param name - Human-readable parameter name for error messages.
 * @throws {Error} If the value is not a finite number.
 */
export function assertFiniteNumber(
  value: unknown,
  name: string
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

/**
 * Assert that a number is finite and greater than zero.
 * @param value - Value to validate.
 * @param name - Human-readable parameter name for error messages.
 * @throws {Error} If the value is not finite or not strictly positive.
 */
export function assertPositiveFinite(
  value: unknown,
  name: string
): asserts value is number {
  assertFiniteNumber(value, name);
  if (value <= POSITIVE_MIN) {
    throw new Error(`${name} must be > ${POSITIVE_MIN}`);
  }
}

/**
 * Assert that a number is finite and at least a minimum value.
 * @param value - Value to validate.
 * @param min - Inclusive lower bound.
 * @param name - Human-readable parameter name for error messages.
 * @throws {Error} If the value is not finite or falls below the bound.
 */
export function assertFiniteAtLeast(
  value: unknown,
  min: number,
  name: string
): asserts value is number {
  assertFiniteNumber(value, name);
  if (value < min) {
    throw new Error(`${name} must be >= ${min}`);
  }
}

export { POSITIVE_MIN };
