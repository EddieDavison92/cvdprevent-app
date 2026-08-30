'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import { DASHBOARD_SECTIONS, findSectionForIndicator, isLowerBetterIndicator, type DashboardSection } from '@/lib/constants/indicator-sections';
import { formatValue, formatDiff, formatAbsDiff } from '@/lib/utils/format';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';

type SortMode = 'gap' | 'trend' | 'name';

interface IndicatorPerformance extends Indicator {
  section: DashboardSection | null;
  data?: IndicatorRawData;
  previousData?: IndicatorRawData;
  baselineData?: IndicatorRawData;
  gap: number | null;
  trend: number | null;
  lowerIsBetter: boolean;
  isBelowBaseline: boolean;
  isAboveBaseline: boolean;
}

interface AllIndicatorsExplorerProps {
  indicators: Indicator[] | undefined;
  dataByIndicator: Map<number, IndicatorRawData>;
  previousDataByIndicator: Map<number, IndicatorRawData>;
  baselineDataByIndicator?: Map<number, IndicatorRawData>;
  baselineName?: string;
  isLoadingIndicators?: boolean;
  isEngland?: boolean;
  selectedCondition?: string | null;
}

function cleanIndicatorName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

function getComparisonState(indicator: IndicatorPerformance, isEngland: boolean) {
  if (isEngland || indicator.gap === null) return 'neutral' as const;
  const effectiveGap = indicator.lowerIsBetter ? -indicator.gap : indicator.gap;
  if (effectiveGap > COMPARISON_TOLERANCE) return 'ahead' as const;
  if (effectiveGap < -COMPARISON_TOLERANCE) return 'behind' as const;
  return 'neutral' as const;
}

function getTrendState(indicator: IndicatorPerformance) {
  if (indicator.trend === null || Math.abs(indicator.trend) < 0.1) return 'stable' as const;
  if (indicator.lowerIsBetter) return indicator.trend < 0 ? 'improving' as const : 'declining' as const;
  return indicator.trend > 0 ? 'improving' as const : 'declining' as const;
}

function sortIndicators(items: IndicatorPerformance[], sortMode: SortMode, isEngland: boolean) {
  return [...items].sort((a, b) => {
    if (sortMode === 'name') {
      return cleanIndicatorName(a.IndicatorShortName).localeCompare(cleanIndicatorName(b.IndicatorShortName));
    }

    if (sortMode === 'trend' || isEngland) {
      const aScore = a.trend === null ? Number.NEGATIVE_INFINITY : Math.abs(a.trend);
      const bScore = b.trend === null ? Number.NEGATIVE_INFINITY : Math.abs(b.trend);
      if (bScore !== aScore) return bScore - aScore;
      return cleanIndicatorName(a.IndicatorShortName).localeCompare(cleanIndicatorName(b.IndicatorShortName));
    }

    const severity = (item: IndicatorPerformance) => {
      if (item.gap === null) return Number.NEGATIVE_INFINITY;
      return item.lowerIsBetter ? item.gap : -item.gap;
    };
    const difference = severity(b) - severity(a);
    if (difference !== 0) return difference;
    return cleanIndicatorName(a.IndicatorShortName).localeCompare(cleanIndicatorName(b.IndicatorShortName));
  });
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function AllIndicatorsExplorer({
  indicators,
  dataByIndicator,
  previousDataByIndicator,
  baselineDataByIndicator,
  baselineName = 'average',
  isLoadingIndicators,
  isEngland = false,
  selectedCondition,
}: AllIndicatorsExplorerProps) {
  const searchParams = useSearchParams();
  const [sortMode, setSortMode] = useState<SortMode>(isEngland ? 'trend' : 'gap');

  const performanceItems = useMemo(() => (indicators ?? []).map((indicator) => {
    const data = dataByIndicator.get(indicator.IndicatorID);
    const previousData = previousDataByIndicator.get(indicator.IndicatorID);
    const baselineData = baselineDataByIndicator?.get(indicator.IndicatorID);
    const gap = !isEngland && data?.Value != null && baselineData?.Value != null ? data.Value - baselineData.Value : null;
    const trend = data?.Value != null && previousData?.Value != null ? data.Value - previousData.Value : null;
    const section = findSectionForIndicator(indicator.IndicatorCode) ?? null;
    const lowerIsBetter = isLowerBetterIndicator(indicator.IndicatorCode);
    const effectiveGap = gap === null ? null : lowerIsBetter ? -gap : gap;

    return {
      ...indicator,
      section,
      data,
      previousData,
      baselineData,
      gap,
      trend,
      lowerIsBetter,
      isBelowBaseline: effectiveGap !== null && effectiveGap < -COMPARISON_TOLERANCE,
      isAboveBaseline: effectiveGap !== null && effectiveGap > COMPARISON_TOLERANCE,
    };
  }), [indicators, dataByIndicator, previousDataByIndicator, baselineDataByIndicator, isEngland]);

  const summary = useMemo(() => {
    const withValues = performanceItems.filter((item) => item.data?.Value != null);
    return {
      visible: withValues.length,
      below: withValues.filter((item) => item.isBelowBaseline).length,
      improving: withValues.filter((item) => getTrendState(item) === 'improving').length,
    };
  }, [performanceItems]);

  const sections = useMemo(() => {
    const groups = new Map<string, { section: DashboardSection | null; items: IndicatorPerformance[] }>();
    for (const item of performanceItems) {
      const key = item.section?.id ?? 'other';
      const current = groups.get(key);
      if (current) current.items.push(item);
      else groups.set(key, { section: item.section, items: [item] });
    }

    return [...groups.values()]
      .map((group) => ({ ...group, items: sortIndicators(group.items, sortMode, isEngland) }))
      .sort((a, b) => {
        if (a.section && b.section) {
          return DASHBOARD_SECTIONS.findIndex((section) => section.id === a.section!.id)
            - DASHBOARD_SECTIONS.findIndex((section) => section.id === b.section!.id);
        }
        return a.section ? -1 : b.section ? 1 : 0;
      });
  }, [performanceItems, sortMode, isEngland]);

  if (isLoadingIndicators) return <ExplorerSkeleton />;

  if (!indicators || indicators.length === 0) {
    return <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-gray-500">No indicators available</div>;
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="all-indicators-heading" className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="all-indicators-heading" className="text-base font-semibold text-gray-900">All indicators</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {summary.visible} with data · {isEngland ? `${summary.improving} improving` : `${summary.below} priority gaps vs ${baselineName}`}
              {selectedCondition ? ` · ${selectedCondition}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><ArrowUpDown className="h-3.5 w-3.5" />Sort by</span>
            <Button type="button" variant={sortMode === (isEngland ? 'trend' : 'gap') ? 'default' : 'outline'} size="sm" onClick={() => setSortMode(isEngland ? 'trend' : 'gap')}>
              {isEngland ? 'Largest change' : 'Largest gap'}
            </Button>
            <Button type="button" variant={sortMode === 'trend' ? 'default' : 'outline'} size="sm" onClick={() => setSortMode('trend')}>Trend</Button>
            <Button type="button" variant={sortMode === 'name' ? 'default' : 'outline'} size="sm" onClick={() => setSortMode('name')}>Name</Button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {sections.map(({ section, items }) => {
          const title = section?.name ?? 'Other indicators';
          const description = section?.description ?? 'Indicators not grouped into a pathway stage.';
          const behind = items.filter((item) => item.isBelowBaseline).length;
          const improving = items.filter((item) => getTrendState(item) === 'improving').length;
          const isRecordedPrevalence = section?.id === 'prevalence';

          return (
            <section key={section?.id ?? 'other'} aria-labelledby={`all-${section?.id ?? 'other'}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
                <div>
                  <h3 id={`all-${section?.id ?? 'other'}`} className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: section?.color ?? '#768692' }} aria-hidden />
                    {title}
                    <span className="text-sm font-normal text-gray-500">{items.length}</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">{description}</p>
                </div>
                <p className="shrink-0 text-xs text-gray-500">
                  {!isEngland && <><span className={behind > 0 ? 'font-semibold text-nhs-red' : ''}>{behind}</span> {isRecordedPrevalence ? 'lower' : 'behind'} · </>}
                  <span className={isRecordedPrevalence ? 'font-semibold text-nhs-blue' : 'font-semibold text-nhs-green'}>{improving}</span> {isRecordedPrevalence ? 'rising' : 'improving'}
                </p>
              </header>

              <ul className="divide-y divide-gray-100">
                {items.map((indicator) => {
                  const comparison = getComparisonState(indicator, isEngland);
                  const trend = getTrendState(indicator);
                  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
                  const comparisonLabel = indicator.gap === null ? '—'
                    : comparison === 'neutral' ? 'In line'
                    : `${formatAbsDiff(indicator.gap, indicator.FormatDisplayName)} ${isRecordedPrevalence
                      ? (indicator.gap > 0 ? 'higher' : 'lower')
                      : comparison}`;

                  return (
                    <li key={indicator.IndicatorID}>
                      <Link
                        href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                        className="group grid min-h-14 items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto_5.5rem_4.5rem_1rem]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-800 group-hover:text-nhs-blue" title={cleanIndicatorName(indicator.IndicatorShortName)}>
                            {cleanIndicatorName(indicator.IndicatorShortName)}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-gray-400">{indicator.IndicatorCode}</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-gray-900">
                          {indicator.data?.Value != null ? formatValue(indicator.data.Value, indicator.FormatDisplayName) : '—'}
                        </p>
                        {!isEngland ? (
                          <p className={cn(
                            'text-xs font-medium tabular-nums sm:text-right',
                            comparison === 'ahead' ? 'text-nhs-green' : comparison === 'behind' ? 'text-nhs-red' : 'text-gray-500'
                          )}>{comparisonLabel}</p>
                        ) : <span />}
                        <p className={cn(
                          'flex items-center justify-end gap-1 text-xs font-medium tabular-nums',
                          isRecordedPrevalence && trend !== 'stable' ? 'text-nhs-blue'
                            : trend === 'improving' ? 'text-nhs-green'
                            : trend === 'declining' ? 'text-nhs-red'
                            : 'text-gray-500'
                        )}>
                          <TrendIcon className="h-3.5 w-3.5" />
                          {indicator.trend === null ? '—' : trend === 'stable' ? 'Stable' : formatDiff(indicator.trend, indicator.FormatDisplayName)}
                        </p>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-nhs-blue" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
