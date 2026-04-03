'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown, Filter, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ComparisonBadge } from './comparison-badge';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import { DASHBOARD_SECTIONS, findSectionForIndicator, type DashboardSection } from '@/lib/constants/indicator-sections';
import { formatValue, formatDiff, formatAbsDiff } from '@/lib/utils/format';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';

type SortMode = 'gap' | 'trend' | 'name';

interface IndicatorPerformance extends Indicator {
  section: DashboardSection | null;
  data?: IndicatorRawData;
  previousData?: IndicatorRawData;
  baselineData?: IndicatorRawData;
  gap: number | null;
  trend: number | null;
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

function SummarySkeleton() {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="px-0">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-white p-4">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function cleanIndicatorName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

function getComparisonState(indicator: IndicatorPerformance, isEngland: boolean) {
  if (isEngland || indicator.gap === null) return 'neutral' as const;

  const section = indicator.section;
  const effectiveGap = section?.lowerIsBetter ? -indicator.gap : indicator.gap;
  if (effectiveGap > 0.5) return 'above' as const;
  if (effectiveGap < -0.5) return 'below' as const;
  return 'neutral' as const;
}

function getTrendState(indicator: IndicatorPerformance) {
  if (indicator.trend === null) return 'flat' as const;
  if (Math.abs(indicator.trend) < 0.1) return 'flat' as const;

  const lowerIsBetter = indicator.section?.lowerIsBetter ?? false;
  if (lowerIsBetter) {
    return indicator.trend < 0 ? 'improving' as const : 'declining' as const;
  }
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

    const getGapSeverity = (item: IndicatorPerformance) => {
      if (item.gap === null) return Number.NEGATIVE_INFINITY;
      const lowerIsBetter = item.section?.lowerIsBetter ?? false;
      return lowerIsBetter ? item.gap : -item.gap;
    };

    const aScore = getGapSeverity(a);
    const bScore = getGapSeverity(b);
    if (bScore !== aScore) return bScore - aScore;
    return cleanIndicatorName(a.IndicatorShortName).localeCompare(cleanIndicatorName(b.IndicatorShortName));
  });
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

  const performanceItems = useMemo(() => {
    return (indicators ?? []).map((indicator) => {
      const data = dataByIndicator.get(indicator.IndicatorID);
      const previousData = previousDataByIndicator.get(indicator.IndicatorID);
      const baselineData = baselineDataByIndicator?.get(indicator.IndicatorID);

      const gap = !isEngland && data?.Value != null && baselineData?.Value != null
        ? data.Value - baselineData.Value
        : null;
      const trend = data?.Value != null && previousData?.Value != null
        ? data.Value - previousData.Value
        : null;

      const section = findSectionForIndicator(indicator.IndicatorCode) ?? null;
      const lowerIsBetter = section?.lowerIsBetter ?? false;
      const effectiveGap = gap === null ? null : (lowerIsBetter ? -gap : gap);

      return {
        ...indicator,
        section,
        data,
        previousData,
        baselineData,
        gap,
        trend,
        isBelowBaseline: effectiveGap !== null && effectiveGap < -0.5,
        isAboveBaseline: effectiveGap !== null && effectiveGap > 0.5,
      };
    });
  }, [indicators, dataByIndicator, previousDataByIndicator, baselineDataByIndicator, isEngland]);

  const summary = useMemo(() => {
    const withValues = performanceItems.filter((item) => item.data?.Value != null);
    const belowBaseline = withValues.filter((item) => item.isBelowBaseline).length;
    const improving = withValues.filter((item) => getTrendState(item) === 'improving').length;
    const groupedSectionCount = new Set(
      withValues
        .filter((item) => item.section !== null)
        .map((item) => item.section!.id)
    ).size;

    return {
      visible: withValues.length,
      belowBaseline,
      improving,
      grouped: groupedSectionCount,
    };
  }, [performanceItems]);

  const sections = useMemo(() => {
    const groups = new Map<string, { section: DashboardSection | null; items: IndicatorPerformance[] }>();

    for (const item of performanceItems) {
      const key = item.section?.id ?? 'other';
      const group = groups.get(key);
      if (group) {
        group.items.push(item);
      } else {
        groups.set(key, { section: item.section, items: [item] });
      }
    }

    return [...groups.values()]
      .map((group) => ({
        section: group.section,
        items: sortIndicators(group.items, sortMode, isEngland),
      }))
      .sort((a, b) => {
        if (a.section && b.section) {
          return DASHBOARD_SECTIONS.findIndex((section) => section.id === a.section!.id)
            - DASHBOARD_SECTIONS.findIndex((section) => section.id === b.section!.id);
        }
        if (a.section) return -1;
        if (b.section) return 1;
        return 0;
      });
  }, [performanceItems, sortMode, isEngland]);

  if (isLoadingIndicators) {
    return (
      <div className="space-y-4">
        <SummarySkeleton />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-xl" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!indicators || indicators.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <p className="text-gray-500">No indicators available</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-nhs-blue/10 bg-gradient-to-r from-white via-white to-nhs-pale-grey/40">
        <CardContent className="p-0">
          <div className="grid gap-0 md:grid-cols-[1.5fr_1fr]">
            <div className="border-b border-nhs-blue/10 p-5 md:border-b-0 md:border-r">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-nhs-blue">
                <Filter className="h-4 w-4" />
                All indicators
              </div>
              <p className="mb-4 max-w-2xl text-sm text-gray-500">
                Browse every indicator in one place, grouped into the same clinical sections used across the dashboard.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border bg-white/85 p-4">
                  <div className="text-xs text-gray-500">Indicators in scope</div>
                  <div className="mt-2 text-3xl font-semibold text-nhs-dark-blue">{summary.visible}</div>
                </div>
                <div className="rounded-2xl border bg-white/85 p-4">
                  <div className="text-xs text-gray-500">Grouped into sections</div>
                  <div className="mt-2 text-3xl font-semibold text-nhs-dark-blue">{summary.grouped}</div>
                </div>
                <div className="rounded-2xl border bg-white/85 p-4">
                  <div className="text-xs text-gray-500">
                    {isEngland ? 'Indicators improving' : `Below ${baselineName}`}
                  </div>
                  <div className={cn(
                    'mt-2 text-3xl font-semibold',
                    isEngland ? 'text-green-700' : 'text-red-700'
                  )}>
                    {isEngland ? summary.improving : summary.belowBaseline}
                  </div>
                </div>
                <div className="rounded-2xl border bg-white/85 p-4">
                  <div className="text-xs text-gray-500">Condition filter</div>
                  <div className="mt-2 text-sm font-medium text-gray-800">
                    {selectedCondition ?? 'All conditions'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                Sort indicators
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={sortMode === (isEngland ? 'trend' : 'gap') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortMode(isEngland ? 'trend' : 'gap')}
                >
                  {isEngland ? 'Largest change' : 'Largest gap'}
                </Button>
                <Button
                  type="button"
                  variant={sortMode === 'trend' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortMode('trend')}
                >
                  Trend
                </Button>
                <Button
                  type="button"
                  variant={sortMode === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortMode('name')}
                >
                  Name
                </Button>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                Start with the biggest gaps, switch to trend when you want movement over time, or sort alphabetically for a full scan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sections.map(({ section, items }) => {
          const title = section?.name ?? 'Other indicators';
          const description = section?.description ?? 'Indicators not yet grouped into a dashboard section.';
          const belowCount = items.filter((item) => item.isBelowBaseline).length;
          const improvingCount = items.filter((item) => getTrendState(item) === 'improving').length;

          return (
            <Card key={section?.id ?? 'other'} className="overflow-hidden border-gray-200">
              <CardHeader className="border-b border-gray-100 bg-white pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: section?.color ?? '#768692' }}
                      />
                      <CardTitle className="text-base text-gray-900">{title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {items.length} indicators
                      </Badge>
                    </div>
                    <CardDescription className="max-w-2xl text-sm">{description}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isEngland && (
                      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                        {belowCount} below {baselineName}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                      {improvingCount} improving
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {items.map((indicator) => {
                    const comparisonState = getComparisonState(indicator, isEngland);
                    const trendState = getTrendState(indicator);
                    const TrendIcon =
                      trendState === 'improving' ? TrendingUp :
                      trendState === 'declining' ? TrendingDown :
                      Minus;

                    return (
                      <Link
                        key={indicator.IndicatorID}
                        href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                        className="group block"
                      >
                        <div className={cn(
                          'grid gap-3 rounded-xl border p-4 transition-all hover:border-nhs-blue/40 hover:bg-nhs-blue/[0.02] hover:shadow-sm',
                          'md:grid-cols-[minmax(0,1.8fr)_auto_auto_auto_auto]',
                          comparisonState === 'below' && 'border-l-4 border-l-red-400',
                          comparisonState === 'above' && 'border-l-4 border-l-green-400',
                          comparisonState === 'neutral' && 'border-l-4 border-l-gray-200'
                        )}>
                          <div className="min-w-0">
                            <div className="mb-1 text-sm font-medium text-gray-900 group-hover:text-nhs-blue">
                              {cleanIndicatorName(indicator.IndicatorShortName)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono text-[11px] text-gray-400">{indicator.IndicatorCode}</span>
                              <span className="text-gray-300">•</span>
                              <span>{indicator.FormatDisplayName}</span>
                            </div>
                          </div>

                          <div className="min-w-[5.5rem]">
                            <div className="text-[11px] uppercase tracking-wide text-gray-400">Current</div>
                            <div className="mt-1 text-lg font-semibold tabular-nums text-nhs-dark-blue">
                              {indicator.data?.Value != null ? formatValue(indicator.data.Value, indicator.FormatDisplayName) : '—'}
                            </div>
                          </div>

                          <div className="min-w-[8rem]">
                            <div className="text-[11px] uppercase tracking-wide text-gray-400">
                              {isEngland ? 'Direction' : 'Comparison'}
                            </div>
                            <div className="mt-1">
                              {isEngland ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'gap-1 whitespace-nowrap',
                                    trendState === 'improving' && 'border-green-200 bg-green-50 text-green-700',
                                    trendState === 'declining' && 'border-red-200 bg-red-50 text-red-700',
                                    trendState === 'flat' && 'border-gray-200 text-gray-500'
                                  )}
                                >
                                  <TrendIcon className="h-3 w-3" />
                                  {trendState === 'flat' ? 'Stable' : trendState}
                                </Badge>
                              ) : (
                                <ComparisonBadge
                                  orgValue={indicator.data?.Value}
                                  baselineValue={indicator.baselineData?.Value}
                                  baselineName={baselineName}
                                  size="sm"
                                />
                              )}
                            </div>
                          </div>

                          <div className="min-w-[6rem]">
                            <div className="text-[11px] uppercase tracking-wide text-gray-400">Trend</div>
                            <div className="mt-1 flex items-center gap-1 text-sm font-medium tabular-nums text-gray-700">
                              <TrendIcon
                                className={cn(
                                  'h-3.5 w-3.5',
                                  trendState === 'improving' && 'text-green-600',
                                  trendState === 'declining' && 'text-red-600',
                                  trendState === 'flat' && 'text-gray-400'
                                )}
                              />
                              {indicator.trend === null ? '—' : formatDiff(indicator.trend, indicator.FormatDisplayName)}
                            </div>
                          </div>

                          <div className="flex min-w-[5rem] items-center justify-between gap-3 md:justify-end">
                            {!isEngland && indicator.gap !== null ? (
                              <div className={cn(
                                'text-sm font-medium tabular-nums',
                                comparisonState === 'above' && 'text-green-700',
                                comparisonState === 'below' && 'text-red-700',
                                comparisonState === 'neutral' && 'text-gray-500'
                              )}>
                                {formatDiff(indicator.gap, indicator.FormatDisplayName)}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                {indicator.previousData?.Value != null ? 'vs prev' : 'No prior'}
                              </div>
                            )}
                            <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-nhs-blue" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
