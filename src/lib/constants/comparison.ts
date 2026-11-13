/** Values within this absolute difference are shown as in line. */
export const COMPARISON_TOLERANCE = 0.5;

export type BaselineGap = 'favourable' | 'unfavourable' | 'inLine';

/**
 * Compare an organisation with its baseline.
 * Missing data (an empty area payload yields undefined) is not a number, so it is not counted.
 */
export function classifyBaselineGap(
  orgValue: unknown,
  comparatorValue: unknown,
  lowerIsBetter: boolean,
): BaselineGap | null {
  if (!Number.isFinite(orgValue) || !Number.isFinite(comparatorValue)) return null;

  const difference = Number(orgValue) - Number(comparatorValue);
  const effectiveDifference = lowerIsBetter ? -difference : difference;
  const isSignificant = Math.abs(difference) > COMPARISON_TOLERANCE;
  if (isSignificant && effectiveDifference > 0) return 'favourable';
  if (isSignificant && effectiveDifference < 0) return 'unfavourable';
  return 'inLine';
}
