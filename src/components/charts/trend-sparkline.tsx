'use client';

import { Sparkline } from './sparkline';

/** Shared dimensions so the Trends and Improvement tabs draw identical sparklines. */
export const TREND_SPARKLINE = { width: 80, height: 28 } as const;

interface TrendSparklineProps {
  values: Array<number | null>;
  /** Peer median per period, aligned with values. */
  reference?: Array<number | null>;
  color: string;
  className?: string;
}

/** Row-height sparkline used wherever a trend sits beside an indicator name. */
export function TrendSparkline({ values, reference, color, className }: TrendSparklineProps) {
  return (
    <Sparkline
      data={values.map((y, i) => ({ x: String(i), y }))}
      reference={reference}
      width={TREND_SPARKLINE.width}
      height={TREND_SPARKLINE.height}
      color={color}
      showArea
      className={className}
    />
  );
}
