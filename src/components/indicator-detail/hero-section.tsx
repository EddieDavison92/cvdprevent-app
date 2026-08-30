'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { formatValue, formatNumber, formatDiff } from '@/lib/utils/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';
import { summariseTrend } from '@/lib/utils/trend';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  indicator: Indicator;
  areaData?: IndicatorRawData;
  baselineData?: IndicatorRawData;
  baselineName?: string;
  previousData?: IndicatorRawData;
  areaName: string;
  isEngland?: boolean;
  timePeriodLabel?: string;
  lowerIsBetter: boolean;
  /** Recorded prevalence: differences describe recording, not performance. */
  recordedPrevalence?: boolean;
  trendValues?: Array<number | null>;
}

export function HeroSection({
  indicator,
  areaData,
  baselineData,
  baselineName = 'England',
  previousData,
  areaName,
  isEngland,
  timePeriodLabel,
  lowerIsBetter,
  recordedPrevalence = false,
  trendValues = [],
}: HeroSectionProps) {
  const fmt = (v: number) => formatValue(v, indicator.FormatDisplayName);

  const trendSummary = summariseTrend(
    trendValues.length >= 2 ? trendValues : [previousData?.Value, areaData?.Value],
  );
  const trend = trendSummary.overall?.change ?? null;
  const latestChange = trendSummary.values.length > 2 ? trendSummary.latest?.change ?? null : null;
  const periodCount = trendSummary.values.length;

  const hasValue = areaData?.Value !== null && areaData?.Value !== undefined;
  const gap = areaData?.Value != null && baselineData?.Value != null
    ? areaData.Value - baselineData.Value
    : null;
  const gapIsSignificant = gap !== null && Math.abs(gap) > COMPARISON_TOLERANCE;
  const gapIsGood = gap !== null && (lowerIsBetter ? gap < 0 : gap > 0);
  const gapTone = recordedPrevalence ? 'neutral' : gapIsSignificant ? (gapIsGood ? 'good' : 'bad') : 'neutral';

  const trendDirection = trendSummary.overall?.direction ?? null;
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const trendIsGood = trendDirection === (lowerIsBetter ? 'down' : 'up');
  const trendIsBad = trendDirection === (lowerIsBetter ? 'up' : 'down');
  const trendTone = recordedPrevalence ? 'neutral' : trendIsGood ? 'good' : trendIsBad ? 'bad' : 'neutral';

  const tone = {
    good: { card: 'border-green-100 bg-green-50/60', value: 'text-green-700', sub: 'text-green-700/70' },
    bad: { card: 'border-red-100 bg-red-50/60', value: 'text-red-700', sub: 'text-red-700/70' },
    neutral: { card: 'bg-gray-50', value: 'text-gray-900', sub: 'text-gray-500' },
  } as const;

  const isPercent = indicator.FormatDisplayName.includes('%');
  const hasPatients = areaData?.Numerator != null && areaData?.Denominator != null;
  // Rates (e.g. age-standardised per 100,000) are not a simple share of patients
  const countsLine = hasPatients
    ? isPercent
      ? `${formatNumber(areaData!.Numerator!)} of ${formatNumber(areaData!.Denominator!)} patients`
      : `${formatNumber(areaData!.Numerator!)} events · ${formatNumber(areaData!.Denominator!)} population`
    : null;
  const unit = !isPercent && indicator.AxisCharacter ? indicator.AxisCharacter : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* Area value */}
      <Card className="border-nhs-blue/20 bg-nhs-blue py-0 text-white">
        <CardContent className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-2 text-xs text-white/75">
            <span className="truncate font-medium">{isEngland ? 'England' : areaName}</span>
            {timePeriodLabel && <span className="shrink-0">{timePeriodLabel}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-2xl font-bold tabular-nums">{hasValue ? fmt(areaData!.Value!) : 'N/A'}</span>
            {unit && <span className="text-xs text-white/75">{unit}</span>}
            {countsLine && <span className="text-xs text-white/75">{countsLine}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Baseline comparison */}
      {!isEngland && (
        <Card className={cn('py-0', tone[gapTone].card)}>
          <CardContent className="px-4 py-3">
            <div className="text-xs font-medium text-gray-500">vs {baselineName}</div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={cn('text-2xl font-bold tabular-nums', tone[gapTone].value)}>
                {gap === null ? '—' : gapIsSignificant ? formatDiff(gap, indicator.FormatDisplayName) : 'Similar'}
              </span>
              <span className={cn('text-xs', tone[gapTone].sub)}>
                {baselineData?.Value != null ? `${baselineName} ${fmt(baselineData.Value)}` : 'No comparison value'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend */}
      <Card className={cn('py-0', tone[trendTone].card)}>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            Trend
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={cn('text-2xl font-bold tabular-nums', tone[trendTone].value)}>
              {trend === null ? '—' : trendDirection === 'flat' ? 'Stable' : formatDiff(trend, indicator.FormatDisplayName)}
            </span>
            <span className={cn('text-xs', tone[trendTone].sub)}>
              {trend === null
                ? 'Not enough history'
                : periodCount > 2 ? `over ${periodCount} periods` : 'from previous period'}
              {latestChange !== null && ` · last ${formatDiff(latestChange, indicator.FormatDisplayName)}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
