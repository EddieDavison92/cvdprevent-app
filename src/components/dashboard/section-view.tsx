'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSection } from '@/lib/constants/indicator-sections';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionViewProps {
  section: DashboardSection;
  indicators: IndicatorWithData[];
  baselineIndicators: IndicatorWithData[];
  baselineName: string;
  collapsedCount?: number;
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
  collapsedCount = 3,
  showBelowOnly = false,
  isLoadingBaseline = false,
  isEngland = false,
}: SectionViewProps) {
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // Build indicator map
  const baselineMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of baselineIndicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [baselineIndicators]);

  // Get indicators for this section
  const sectionIndicators: IndicatorRow[] = useMemo(() => {
    const rows = section.indicatorCodes
      .map(code => {
        const indicator = indicators.find(i => i.IndicatorCode === code);
        if (!indicator) return null;

        const persons = getPersonsData(indicator);
        const value = persons?.Data.Value ?? null;

        // Get previous value from time series
        let previousValue: number | null = null;
        if (persons?.TimeSeries && persons.TimeSeries.length >= 2) {
          previousValue = persons.TimeSeries[persons.TimeSeries.length - 2]?.Value ?? null;
        }

        // Get baseline
        const baselineInd = baselineMap.get(code);
        const baselinePersons = baselineInd ? getPersonsData(baselineInd) : null;
        const baselineValue = baselinePersons?.Data.Value ?? null;

        const gap = value !== null && baselineValue !== null ? value - baselineValue : null;
        const trend = value !== null && previousValue !== null ? value - previousValue : null;

        return { indicator, value, baselineValue, previousValue, gap, trend };
      })
      .filter((row): row is IndicatorRow => row !== null && row.value !== null);

    // Sort by gap (worst first) or by trend for England
    if (isEngland) {
      rows.sort((a, b) => {
        if (a.trend === null && b.trend === null) return 0;
        if (a.trend === null) return 1;
        if (b.trend === null) return -1;
        // Worst trend first: for lowerIsBetter, increasing = bad; otherwise decreasing = bad
        return section.lowerIsBetter ? b.trend - a.trend : a.trend - b.trend;
      });
    } else {
      rows.sort((a, b) => {
        if (a.gap === null && b.gap === null) return 0;
        if (a.gap === null) return 1;
        if (b.gap === null) return -1;
        return section.lowerIsBetter ? b.gap - a.gap : a.gap - b.gap;
      });
    }

    return rows;
  }, [section.indicatorCodes, section.lowerIsBetter, indicators, baselineMap, isEngland]);

  // Filter to below average only if requested
  const filteredIndicators = useMemo(() => {
    if (!showBelowOnly) return sectionIndicators;

    return sectionIndicators.filter(row => {
      if (row.gap === null) return false;
      return section.lowerIsBetter ? row.gap > 0.5 : row.gap < -0.5;
    });
  }, [sectionIndicators, showBelowOnly, section.lowerIsBetter]);

  // Determine what to show
  const displayIndicators = isExpanded
    ? filteredIndicators
    : filteredIndicators.slice(0, collapsedCount);

  const hasMore = filteredIndicators.length > collapsedCount;

  // Calculate section summary
  const summary = useMemo(() => {
    if (isEngland) {
      const withTrends = sectionIndicators.filter(r => r.trend !== null);
      if (withTrends.length === 0) return null;
      const improving = withTrends.filter(r => {
        const good = section.lowerIsBetter ? r.trend! < -0.1 : r.trend! > 0.1;
        return good;
      }).length;
      const declining = withTrends.filter(r => {
        const bad = section.lowerIsBetter ? r.trend! > 0.1 : r.trend! < -0.1;
        return bad;
      }).length;
      const stable = withTrends.length - improving - declining;
      return { isEngland: true as const, improving, declining, stable, total: withTrends.length };
    }

    const withGaps = sectionIndicators.filter(r => r.gap !== null);
    if (withGaps.length === 0) return null;

    const avgGap = withGaps.reduce((sum, r) => sum + r.gap!, 0) / withGaps.length;
    const effectiveGap = section.lowerIsBetter ? -avgGap : avgGap;
    const aboveCount = withGaps.filter(r => section.lowerIsBetter ? r.gap! < -0.5 : r.gap! > 0.5).length;
    const belowCount = withGaps.filter(r => section.lowerIsBetter ? r.gap! > 0.5 : r.gap! < -0.5).length;

    return { isEngland: false as const, effectiveGap, aboveCount, belowCount, total: withGaps.length };
  }, [sectionIndicators, section.lowerIsBetter, isEngland]);

  if (filteredIndicators.length === 0) {
    return null;
  }

  const formatFn = (v: number) => formatValue(v, '%');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: section.color }}
            />
            <CardTitle className="text-base">{section.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredIndicators.length} indicators
            </Badge>
          </div>
          {isLoadingBaseline && !isEngland ? (
            <Skeleton className="h-5 w-40" />
          ) : summary && summary.isEngland ? (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {summary.improving > 0 && <span className="text-green-600">{summary.improving} improving</span>}
              {summary.stable > 0 && <span>{summary.stable} stable</span>}
              {summary.declining > 0 && <span className="text-red-600">{summary.declining} declining</span>}
            </div>
          ) : summary && !summary.isEngland ? (
            <div className={cn(
              'text-sm font-medium flex items-center gap-1',
              summary.effectiveGap > 1 ? 'text-green-600' :
              summary.effectiveGap < -1 ? 'text-red-600' : 'text-gray-500'
            )}>
              {summary.effectiveGap > 1 ? <CheckCircle2 className="w-4 h-4" /> :
               summary.effectiveGap < -1 ? <AlertTriangle className="w-4 h-4" /> :
               <Minus className="w-4 h-4" />}
              {summary.aboveCount} above, {summary.belowCount} below {baselineName}
            </div>
          ) : null}
        </div>
        <CardDescription className="text-xs">
          {section.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayIndicators.map((row) => {
            const { indicator, value, baselineValue, gap, trend } = row;

            // For lowerIsBetter, invert the color logic
            const effectiveGap = section.lowerIsBetter && gap !== null ? -gap : gap;
            const gapDirection = effectiveGap !== null
              ? (effectiveGap > 0.5 ? 'above' : effectiveGap < -0.5 ? 'below' : 'at')
              : null;

            const trendDirection = trend !== null
              ? (Math.abs(trend) < 0.1 ? 'flat' : trend > 0 ? 'up' : 'down')
              : null;

            const trendGood = section.lowerIsBetter
              ? trendDirection === 'down'
              : trendDirection === 'up';

            return (
              <Link
                key={indicator.IndicatorID}
                href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                className="block group"
              >
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    'hover:shadow-sm hover:border-nhs-blue/30',
                    !isEngland && gapDirection === 'below' && 'border-l-red-400 border-l-[3px]',
                    !isEngland && gapDirection === 'above' && 'border-l-green-400 border-l-[3px]',
                    !isEngland && gapDirection === 'at' && 'border-l-gray-300 border-l-[3px]',
                    isEngland && trendGood && 'border-l-green-400 border-l-[3px]',
                    isEngland && trendDirection !== null && !trendGood && trendDirection !== 'flat' && 'border-l-red-400 border-l-[3px]',
                    isEngland && trendDirection === 'flat' && 'border-l-gray-300 border-l-[3px]',
                  )}
                >
                  {/* Indicator name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate group-hover:text-nhs-blue">
                      {cleanName(indicator.IndicatorShortName)}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span className="text-sm font-semibold tabular-nums text-gray-900">
                      {value !== null ? formatFn(value) : '—'}
                    </span>
                    {!isEngland && baselineValue !== null && (
                      <span className="text-xs text-gray-500 tabular-nums">
                        / {formatFn(baselineValue)}
                      </span>
                    )}
                  </div>

                  {/* Gap badge (non-England) or Trend badge (England) */}
                  <div className="max-w-40 flex-shrink-0">
                    {isEngland ? (
                      trend !== null && trendDirection !== 'flat' ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs justify-center whitespace-nowrap',
                            trendGood && 'border-green-300 bg-green-50 text-green-700',
                            !trendGood && 'border-red-300 bg-red-50 text-red-700',
                          )}
                        >
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}pp {trendGood ? 'improving' : 'declining'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs justify-center whitespace-nowrap border-gray-200 text-gray-500">
                          Stable
                        </Badge>
                      )
                    ) : (
                      <>
                        {isLoadingBaseline ? (
                          <Skeleton className="h-5 w-full rounded-full" />
                        ) : gap !== null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs justify-center whitespace-nowrap',
                              gapDirection === 'above' && 'border-green-300 bg-green-50 text-green-700',
                              gapDirection === 'below' && 'border-red-300 bg-red-50 text-red-700',
                              gapDirection === 'at' && 'border-gray-200 text-gray-500',
                            )}
                          >
                            {gapDirection === 'at'
                              ? `At ${baselineName}`
                              : `${Math.abs(gap).toFixed(1)}pp ${gapDirection}`}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>

                  {/* Trend icon */}
                  <div className="w-6 flex justify-center flex-shrink-0">
                    {trendDirection === 'up' && (
                      <TrendingUp className={cn('w-4 h-4', trendGood ? 'text-green-500' : 'text-red-500')} />
                    )}
                    {trendDirection === 'down' && (
                      <TrendingDown className={cn('w-4 h-4', trendGood ? 'text-green-500' : 'text-red-500')} />
                    )}
                    {trendDirection === 'flat' && (
                      <Minus className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Navigation arrow */}
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-nhs-blue transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Expand/Collapse button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show {filteredIndicators.length - collapsedCount} more
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
