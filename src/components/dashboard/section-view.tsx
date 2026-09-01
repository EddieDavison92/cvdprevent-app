'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { isLowerBetterIndicator, type DashboardSection } from '@/lib/constants/indicator-sections';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue, formatAbsDiff, formatDiff } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';
import { getTrendDirection } from '@/lib/utils/trend';

interface SectionViewProps {
  section: DashboardSection;
  indicators: IndicatorWithData[];
  baselineIndicators: IndicatorWithData[];
  baselineName: string;
  showBelowOnly?: boolean;
  isLoadingBaseline?: boolean;
  isEngland?: boolean;
}

interface IndicatorRow {
  indicator: IndicatorWithData;
  value: number | null;
  baselineValue: number | null;
  previousValue: number | null;
  gap: number | null;
  trend: number | null;
  lowerIsBetter: boolean;
  trendValues: Array<number | null>;
}

function getPersonsData(indicator: IndicatorWithData) {
  return indicator.Categories.find(
    c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
}

function cleanName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

export function SectionView({
  section,
  indicators,
  baselineIndicators,
  baselineName,
  showBelowOnly = false,
  isLoadingBaseline = false,
  isEngland = false,
}: SectionViewProps) {
  const searchParams = useSearchParams();
  const isRecordedPrevalence = section.id === 'prevalence';

  const baselineMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of baselineIndicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [baselineIndicators]);

  const sectionIndicators: IndicatorRow[] = useMemo(() => {
    const rows = section.indicatorCodes
      .map(code => {
        const indicator = indicators.find(i => i.IndicatorCode === code);
        if (!indicator) return null;

        const persons = getPersonsData(indicator);
        const value = persons?.Data.Value ?? null;

        let previousValue: number | null = null;
        if (persons?.TimeSeries && persons.TimeSeries.length >= 2) {
          previousValue = persons.TimeSeries[persons.TimeSeries.length - 2]?.Value ?? null;
        }

        const baselineInd = baselineMap.get(code);
        const baselinePersons = baselineInd ? getPersonsData(baselineInd) : null;
        const baselineValue = baselinePersons?.Data.Value ?? null;

        const gap = value !== null && baselineValue !== null ? value - baselineValue : null;
        const trend = value !== null && previousValue !== null ? value - previousValue : null;

        return {
          indicator,
          value,
          baselineValue,
          previousValue,
          gap,
          trend,
          lowerIsBetter: isLowerBetterIndicator(code, indicator),
          trendValues: persons?.TimeSeries?.map(point => point.Value) ?? [],
        };
      })
      .filter((row): row is IndicatorRow => row !== null && row.value !== null);

    // Recorded prevalence is descriptive, so order it by the largest absolute difference.
    if (isEngland) {
      rows.sort((a, b) => {
        if (a.trend === null && b.trend === null) return 0;
        if (a.trend === null) return 1;
        if (b.trend === null) return -1;
        if (isRecordedPrevalence) return Math.abs(b.trend) - Math.abs(a.trend);
        const aSeverity = a.lowerIsBetter ? a.trend : -a.trend;
        const bSeverity = b.lowerIsBetter ? b.trend : -b.trend;
        return bSeverity - aSeverity;
      });
    } else {
      rows.sort((a, b) => {
        if (a.gap === null && b.gap === null) return 0;
        if (a.gap === null) return 1;
        if (b.gap === null) return -1;
        if (isRecordedPrevalence) return Math.abs(b.gap) - Math.abs(a.gap);
        const aSeverity = a.lowerIsBetter ? a.gap : -a.gap;
        const bSeverity = b.lowerIsBetter ? b.gap : -b.gap;
        return bSeverity - aSeverity;
      });
    }

    return rows;
  }, [section.indicatorCodes, indicators, baselineMap, isEngland, isRecordedPrevalence]);

  const filteredIndicators = useMemo(() => {
    if (!showBelowOnly || isRecordedPrevalence) return sectionIndicators;
    return sectionIndicators.filter(row => {
      if (row.gap === null) return false;
      return row.lowerIsBetter ? row.gap > COMPARISON_TOLERANCE : row.gap < -COMPARISON_TOLERANCE;
    });
  }, [sectionIndicators, showBelowOnly, isRecordedPrevalence]);

  const summary = useMemo(() => {
    if (isEngland) {
      const withTrends = sectionIndicators.filter(r => r.trend !== null);
      if (withTrends.length === 0) return null;
      if (isRecordedPrevalence) {
        const rising = withTrends.filter(row => getTrendDirection(row.trend!, row.trendValues) === 'up').length;
        const falling = withTrends.filter(row => getTrendDirection(row.trend!, row.trendValues) === 'down').length;
        return { good: rising, bad: falling, total: withTrends.length, goodLabel: 'rising', badLabel: 'falling' };
      }
      const improving = withTrends.filter(row => {
        const direction = getTrendDirection(row.trend!, row.trendValues);
        return row.lowerIsBetter ? direction === 'down' : direction === 'up';
      }).length;
      const declining = withTrends.filter(row => {
        const direction = getTrendDirection(row.trend!, row.trendValues);
        return row.lowerIsBetter ? direction === 'up' : direction === 'down';
      }).length;
      return { good: improving, bad: declining, total: withTrends.length, goodLabel: 'improving', badLabel: 'declining' };
    }

    const withGaps = sectionIndicators.filter(r => r.gap !== null);
    if (withGaps.length === 0) return null;
    const ahead = withGaps.filter(r => r.lowerIsBetter ? r.gap! < -COMPARISON_TOLERANCE : r.gap! > COMPARISON_TOLERANCE).length;
    const behind = withGaps.filter(r => r.lowerIsBetter ? r.gap! > COMPARISON_TOLERANCE : r.gap! < -COMPARISON_TOLERANCE).length;
    return {
      good: ahead,
      bad: behind,
      total: withGaps.length,
      goodLabel: isRecordedPrevalence ? 'higher' : 'ahead',
      badLabel: isRecordedPrevalence ? 'lower' : 'behind',
    };
  }, [sectionIndicators, isEngland, isRecordedPrevalence]);

  if (filteredIndicators.length === 0) {
    return null;
  }

  const headingId = `section-${section.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={headingId} className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />
              {section.name}
              <span className="text-sm font-normal text-gray-500">{filteredIndicators.length}</span>
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">{section.description}</p>
          </div>

          {isLoadingBaseline && !isEngland ? (
            <Skeleton className="h-5 w-28" />
          ) : summary && (
            <p className="shrink-0 whitespace-nowrap text-xs tabular-nums text-gray-500">
              <span className={cn('font-semibold', isRecordedPrevalence ? 'text-slate-600' : summary.bad > 0 ? 'text-nhs-red' : 'text-gray-700')}>{summary.bad}</span> {summary.badLabel}
              <span className="mx-1.5 text-gray-300">·</span>
              <span className={cn('font-semibold', isRecordedPrevalence ? 'text-slate-600' : 'text-nhs-green')}>{summary.good}</span> {summary.goodLabel}
            </p>
          )}
        </div>

        {summary && (
          <div
            className="mt-2 flex h-1 overflow-hidden rounded-full bg-gray-100"
            role="img"
            aria-label={`${summary.good} ${summary.goodLabel}, ${summary.bad} ${summary.badLabel} of ${summary.total}${isEngland ? '' : ` compared with ${baselineName}`}`}
          >
            <span className={isRecordedPrevalence ? 'bg-slate-400' : 'bg-nhs-green'} style={{ width: `${(summary.good / summary.total) * 100}%` }} />
            <span className="bg-gray-300" style={{ width: `${((summary.total - summary.good - summary.bad) / summary.total) * 100}%` }} />
            <span className={isRecordedPrevalence ? 'bg-slate-600' : 'bg-nhs-red'} style={{ width: `${(summary.bad / summary.total) * 100}%` }} />
          </div>
        )}
      </header>

      <ul className="divide-y divide-gray-100">
        {filteredIndicators.map((row) => {
          const { indicator, value, baselineValue, gap, trend, lowerIsBetter, trendValues } = row;
          const fmt = indicator.FormatDisplayName;

          const effectiveGap = lowerIsBetter && gap !== null ? -gap : gap;
          const gapDirection = effectiveGap !== null
            ? (effectiveGap > COMPARISON_TOLERANCE ? 'ahead' : effectiveGap < -COMPARISON_TOLERANCE ? 'behind' : 'at')
            : null;
          const gapLabel = gapDirection === 'at'
            ? 'In line'
            : `${formatAbsDiff(gap!, fmt)} ${isRecordedPrevalence ? (gap! > 0 ? 'higher' : 'lower') : gapDirection}`;

          const trendDirection = trend !== null ? getTrendDirection(trend, trendValues) : null;
          const trendGood = lowerIsBetter ? trendDirection === 'down' : trendDirection === 'up';
          const trendLabel = trend === null ? 'No previous period'
            : trendDirection === 'flat' ? 'Stable'
            : `${formatDiff(trend, fmt)} since last period`;
          const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

          return (
            <li key={indicator.IndicatorID}>
              <Link
                href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                className="group grid items-center gap-x-3 gap-y-1 px-4 py-2 hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto_5.5rem_1.25rem]"
              >
                <p className="min-w-0 truncate text-sm text-gray-800 group-hover:text-nhs-blue" title={cleanName(indicator.IndicatorShortName)}>
                  {cleanName(indicator.IndicatorShortName)}
                </p>

                <p className="text-sm tabular-nums sm:text-right">
                  <span className="font-semibold text-gray-900">{value !== null ? formatValue(value, fmt) : '—'}</span>
                  {!isEngland && baselineValue !== null && (
                    <span className="text-gray-400"> vs {formatValue(baselineValue, fmt)}</span>
                  )}
                </p>

                {isEngland ? (
                  <span className={cn(
                    'text-xs font-medium tabular-nums sm:text-right',
                    trendDirection === 'flat' || trend === null ? 'text-gray-500' : trendGood ? 'text-nhs-green' : 'text-nhs-red',
                  )}>
                    {trend === null ? '—' : trendDirection === 'flat' ? 'Stable' : formatDiff(trend, fmt)}
                  </span>
                ) : isLoadingBaseline ? (
                  <Skeleton className="h-4 w-full" />
                ) : gap !== null ? (
                  <span className={cn(
                    'text-xs font-medium tabular-nums sm:text-right',
                    gapDirection === 'ahead' && (isRecordedPrevalence ? 'text-slate-600' : 'text-nhs-green'),
                    gapDirection === 'behind' && (isRecordedPrevalence ? 'text-slate-600' : 'text-nhs-red'),
                    gapDirection === 'at' && 'text-gray-500',
                  )}>
                    {gapLabel}
                  </span>
                ) : <span />}

                <TrendIcon
                  className={cn(
                    'h-4 w-4 justify-self-end',
                    trend === null ? 'text-gray-200'
                      : isRecordedPrevalence ? 'text-slate-500'
                        : trendDirection === 'flat' ? 'text-gray-400'
                          : trendGood ? 'text-nhs-green' : 'text-nhs-red',
                  )}
                  aria-label={trendLabel}
                  role="img"
                />
              </Link>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
