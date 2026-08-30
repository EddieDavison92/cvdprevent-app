export type TrendDirection = 'up' | 'down' | 'flat';

/**
 * Treats a change as flat only when it is negligible against the recent
 * series range and would not alter the displayed value.
 */
export function getTrendDirection(
  change: number,
  seriesValues: Array<number | null | undefined>,
): TrendDirection {
  const values = seriesValues.filter((value): value is number => value != null && Number.isFinite(value));
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const recentRange = max - min;
  const paddedRange = recentRange * 1.3;
  const scaleTolerance = paddedRange * 0.02;

  const usesTwoDecimals = values.length > 0 && values.every(value => Math.abs(value) < 1);
  const displayTolerance = usesTwoDecimals ? 0.005 : 0.05;
  const tolerance = Math.max(scaleTolerance, displayTolerance);

  if (Math.abs(change) < tolerance) return 'flat';
  return change > 0 ? 'up' : 'down';
}

export interface TrendChange {
  change: number;
  direction: TrendDirection;
}

export interface TrendSummary {
  /** Valid values in period order. */
  values: number[];
  /** Change between the latest two periods. */
  latest: TrendChange | null;
  /** Alias of latest retained for existing consumers. */
  overall: TrendChange | null;
}

/**
 * Single source of trend direction for all views. CVDPREVENT's quality
 * improvement tool defines recent change using the latest two published
 * periods, so every summary uses that same comparison.
 */
export function summariseTrend(seriesValues: Array<number | null | undefined>): TrendSummary {
  const values = seriesValues.filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length < 2) return { values, latest: null, overall: null };

  const latestChange = values[values.length - 1] - values[values.length - 2];
  const latest = { change: latestChange, direction: getTrendDirection(latestChange, values) };
  return { values, latest, overall: latest };
}
