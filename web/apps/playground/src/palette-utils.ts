/**
 * Palette utilities for the playground UI.
 * What: Defines available palettes and validation helpers.
 * Why: Centralizes palette management and prevents magic strings.
 * How: Exports typed constants and runtime guards.
 */
import type { PaletteName } from '@spectro/viewer';

/**
 * All palettes supported by the playground.
 * What: List of palette value/label pairs.
 * Why: Ensures the select input stays in sync with viewer capabilities.
 * How: Declared as a readonly array for immutability and type safety.
 */
export const PALETTE_OPTIONS: ReadonlyArray<{ value: PaletteName; label: string }> = [
  { value: 'viridis', label: 'Viridis' },
  { value: 'magma', label: 'Magma' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'cividis', label: 'Cividis' },
  { value: 'coolwarm', label: 'Coolwarm' },
  { value: 'twilight', label: 'Twilight' },
  { value: 'turbo', label: 'Turbo' }
] as const;

/**
 * Default palette when none is specified.
 * What: Initial palette used on app load.
 * Why: Provides a safe fallback that is perceptually uniform.
 * How: Exposed as a constant to avoid repeated string literals.
 */
export const DEFAULT_PALETTE: PaletteName = 'viridis';

/**
 * Cached list of palette values for quick membership tests.
 * What: Extracts the value property from {@link PALETTE_OPTIONS}.
 * Why: Avoids recomputation during validation and reduces memory churn.
 * How: Uses map once at module load and stores as readonly tuple.
 */
const PALETTE_VALUES: readonly PaletteName[] = PALETTE_OPTIONS.map(p => p.value);

/**
 * Determine whether a string is a valid {@link PaletteName}.
 * What: Runtime type guard for palette names.
 * Why: Protects against DOM tampering and programming errors.
 * How: Checks membership within {@link PALETTE_VALUES}.
 */
export function isPaletteName(value: string): value is PaletteName {
  return (PALETTE_VALUES as readonly string[]).includes(value);
}
