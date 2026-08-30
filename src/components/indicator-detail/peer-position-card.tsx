'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PeerRangeBar, STATUS_META } from '@/components/dashboard/peer-range-bar';
import type { IndicatorWithData } from '@/lib/api/types';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';
import { classifyIndicator } from '@/lib/constants/indicator-sections';
import { formatAbsDiff, formatValue } from '@/lib/utils/format';
import type { PerformanceStatus } from '@/lib/utils/quality-improvement';
import { cn } from '@/lib/utils';

interface PeerPositionCardProps {
  indicator: IndicatorWithData;
  areaName: string;
  areaValue: number | null | undefined;
  /** Values for every organisation in the comparison set, including this area. */
  peerValues: Array<number | null | undefined>;
  /** e.g. "ICBs in England" or "ICBs in London". */
  scopeLabel: string;
}

function percentile(sorted: number[], p: number): number {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Where the area sits within the selected comparison set, using the same rules as the Improvement tab. */
export function PeerPositionCard({ indicator, areaName, areaValue, peerValues, scopeLabel }: PeerPositionCardProps) {
  const stats = useMemo(() => {
    const values = peerValues
      .filter((v): v is number => v != null && Number.isFinite(v))
      .sort((a, b) => a - b);
    if (values.length < 2 || areaValue == null) return null;
    // Quintile ticks only mean something with a reasonable number of peers
    const quintileBounds = values.length >= 10 ? [0.2, 0.4, 0.6, 0.8].map((p) => percentile(values, p)) : [];
    const { lowerIsBetter, section } = classifyIndicator(indicator);
    const isRecordedPrevalence = section.id === 'prevalence';
    // Rank 1 = best given polarity; for recorded prevalence, rank by highest recorded rate
    const rank = (!isRecordedPrevalence && lowerIsBetter
      ? values.filter((v) => v < areaValue)
      : values.filter((v) => v > areaValue)).length + 1;
    // Median of the OTHER organisations: comparing an area with a median that
    // includes itself pins mid-ranked areas to the line in small sets
    const selfIndex = values.indexOf(areaValue);
    const others = selfIndex === -1 ? values : values.filter((_, i) => i !== selfIndex);
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      median: others.length > 0 ? percentile(others, 0.5) : percentile(values, 0.5),
      quintileBounds,
      rank,
      lowerIsBetter,
      isRecordedPrevalence,
    };
  }, [peerValues, areaValue, indicator]);

  if (!stats || areaValue == null) return null;

  const gap = areaValue - stats.median;
  const performanceGap = stats.lowerIsBetter ? -gap : gap;
  const status: PerformanceStatus = stats.isRecordedPrevalence
    ? 'recording'
    : Math.abs(gap) <= COMPARISON_TOLERANCE
      ? 'similar'
      : performanceGap > 0 ? 'favourable' : 'unfavourable';

  const fmt = (v: number) => formatValue(v, indicator.FormatDisplayName);
  const meta = STATUS_META[status];
  const gapText = status === 'similar'
    ? 'close to the peer median'
    : status === 'recording'
      ? `${formatAbsDiff(gap, indicator.FormatDisplayName)} ${gap > 0 ? 'higher' : 'lower'} recording than the peer median`
      : `${formatAbsDiff(gap, indicator.FormatDisplayName)} ${status === 'favourable' ? 'better' : 'worse'} than the peer median`;
  const rankClause = status === 'recording'
    ? 'by recorded rate'
    : `${stats.lowerIsBetter ? 'lowest' : 'highest'} is best`;
  // Small sets: a gap to the median of a handful of values is weak evidence, so lead with rank
  const smallSet = stats.count < 10;

  return (
    <Card className={cn('border-l-4 py-4', meta.stripe)}>
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 lg:w-64">
          <p className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', meta.text)}>
            <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden />
            {meta.label}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {smallSet
              ? `${areaName} ranks ${ordinal(stats.rank)} of the ${stats.count} ${scopeLabel} (${rankClause}) and is ${gapText}.`
              : `${areaName} is ${gapText} of the ${stats.count} ${scopeLabel} (${ordinal(stats.rank)} of ${stats.count}, ${rankClause}).`}
          </p>
        </div>

        <div className="flex-1">
          <PeerRangeBar
            value={areaValue}
            min={stats.min}
            max={stats.max}
            median={stats.median}
            quintileBounds={stats.quintileBounds}
            areaLabel={areaName}
            status={status}
            formatDisplayName={indicator.FormatDisplayName}
          />
          <div className="relative mt-1 flex justify-between text-[10px] tabular-nums text-gray-400">
            <span>Lowest {fmt(stats.min)}</span>
            {/* Median excludes the area itself */}
            {/* Anchored under the median tick, clamped clear of the end labels */}
            <span
              className="absolute -translate-x-1/2 font-medium text-gray-500"
              style={{ left: `${Math.min(82, Math.max(18, ((stats.median - stats.min) / (stats.max - stats.min)) * 100))}%` }}
            >
              Median {fmt(stats.median)}
            </span>
            <span>Highest {fmt(stats.max)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
