'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { IndicatorWithData } from '@/lib/api/types';
import { DASHBOARD_SECTIONS, isLowerBetterIndicator } from '@/lib/constants/indicator-sections';
import { formatValue, formatAbsDiff } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrioritiesCardProps {
  indicators: IndicatorWithData[];
  baselineIndicators: IndicatorWithData[];
  baselineName: string;
  maxItems?: number;
  isLoadingBaseline?: boolean;
}

interface PriorityItem {
  indicator: IndicatorWithData;
  value: number;
  baselineValue: number;
  gap: number;
  trend: number | null;
  reason: 'gap' | 'deteriorating' | 'both';
  section: typeof DASHBOARD_SECTIONS[0] | undefined;
  lowerIsBetter: boolean;
}

/** Gap beyond which an indicator counts as a priority (percentage points). */
const GAP_THRESHOLD = 2;
/** Period-on-period change beyond which a trend counts as deteriorating. */
const TREND_THRESHOLD = 1;

function getPersonsData(indicator: IndicatorWithData) {
  return indicator.Categories.find(
    c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
}

function cleanName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

export function PrioritiesCard({
  indicators,
  baselineIndicators,
  baselineName,
  maxItems = 5,
  isLoadingBaseline = false,
}: PrioritiesCardProps) {
  const searchParams = useSearchParams();

  const baselineMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of baselineIndicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [baselineIndicators]);

  const priorities: PriorityItem[] = useMemo(() => {
    const items: PriorityItem[] = [];

    for (const indicator of indicators) {
      const persons = getPersonsData(indicator);
      if (!persons || persons.Data.Value === null) continue;

      const value = persons.Data.Value;
      const baselineInd = baselineMap.get(indicator.IndicatorCode);
      const baselinePersons = baselineInd ? getPersonsData(baselineInd) : null;
      if (!baselinePersons || baselinePersons.Data.Value === null) continue;

      const baselineValue = baselinePersons.Data.Value;
      const gap = value - baselineValue;

      let trend: number | null = null;
      if (persons.TimeSeries && persons.TimeSeries.length >= 2) {
        const prev = persons.TimeSeries[persons.TimeSeries.length - 2]?.Value;
        if (prev !== null && prev !== undefined) {
          trend = value - prev;
        }
      }

      const section = DASHBOARD_SECTIONS.find(s =>
        s.indicatorCodes.includes(indicator.IndicatorCode)
      );

      // For lowerIsBetter sections a positive gap / rising trend is bad
      const lowerIsBetter = isLowerBetterIndicator(indicator.IndicatorCode);
      const effectiveGap = lowerIsBetter ? gap : -gap;
      const isSignificantGap = effectiveGap > GAP_THRESHOLD;
      const isDeteriorating = trend !== null && (
        lowerIsBetter ? trend > TREND_THRESHOLD : trend < -TREND_THRESHOLD
      );

      if (isSignificantGap || isDeteriorating) {
        items.push({
          indicator,
          value,
          baselineValue,
          gap,
          trend,
          reason: isSignificantGap && isDeteriorating ? 'both' :
                  isSignificantGap ? 'gap' : 'deteriorating',
          section,
          lowerIsBetter,
        });
      }
    }

    // Sort by severity: both > gap size > deteriorating
    items.sort((a, b) => {
      if (a.reason === 'both' && b.reason !== 'both') return -1;
      if (b.reason === 'both' && a.reason !== 'both') return 1;
      const aEffective = a.lowerIsBetter ? a.gap : -a.gap;
      const bEffective = b.lowerIsBetter ? b.gap : -b.gap;
      return bEffective - aEffective;
    });

    return items.slice(0, maxItems);
  }, [indicators, baselineMap, maxItems]);

  const criteria = `More than ${GAP_THRESHOLD}pp from ${baselineName} in an unfavourable direction, or worsened by more than ${TREND_THRESHOLD}pp since the previous period.`;

  return (
    <section aria-labelledby="priorities-heading" className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 id="priorities-heading" className="text-base font-semibold text-gray-900">Priorities</h2>
          {!isLoadingBaseline && priorities.length > 0 && (
            <span className="text-sm text-gray-500">{priorities.length} to review</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{criteria}</p>
      </div>

      {isLoadingBaseline ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comparing with {baselineName}…
        </div>
      ) : priorities.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-nhs-green">
          <CheckCircle2 className="h-4 w-4" />
          No indicators meet the priority criteria.
        </div>
      ) : (
        <ol className="divide-y divide-gray-100">
          {priorities.map(({ indicator, value, baselineValue, gap, trend, reason, section, lowerIsBetter }, i) => {
            const fmt = indicator.FormatDisplayName;
            const isRecordedPrevalence = section?.id === 'prevalence';
            const gapIsBad = lowerIsBetter ? gap > 0 : gap < 0;
            const trendIsBad = trend !== null && (lowerIsBetter ? trend > 0 : trend < 0);
            const showTrend = trend !== null && Math.abs(trend) >= 0.1;

            return (
              <li key={indicator.IndicatorID}>
                <Link
                  href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                  className="group grid items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:grid-cols-[1.5rem_minmax(0,1fr)_auto_auto_1rem]"
                >
                  <span className="hidden text-sm font-semibold tabular-nums text-gray-400 sm:block">{i + 1}</span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 group-hover:text-nhs-blue">
                      {cleanName(indicator.IndicatorShortName)}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                      {section && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />
                          {section.name}
                        </span>
                      )}
                      <span className={cn(gapIsBad ? 'text-nhs-red' : 'text-nhs-green')}>
                        {formatAbsDiff(gap, fmt)} {isRecordedPrevalence
                          ? `${gap < 0 ? 'lower than' : 'higher than'} ${baselineName}`
                          : `${gapIsBad ? 'behind' : 'ahead of'} ${baselineName}`}
                      </span>
                      {showTrend && (
                        <span className={cn(trendIsBad ? 'text-nhs-red' : 'text-nhs-green')}>
                          {trend! > 0 ? '↑' : '↓'} {formatAbsDiff(trend!, fmt)} since last period
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-sm tabular-nums sm:text-right">
                    <span className="font-semibold text-gray-900">{formatValue(value, fmt)}</span>
                    <span className="text-gray-400"> vs {formatValue(baselineValue, fmt)}</span>
                  </div>

                  <span className={cn(
                    'w-fit rounded px-1.5 py-0.5 text-[11px] font-medium',
                    reason === 'both' && 'bg-nhs-red/10 text-nhs-red',
                    reason === 'gap' && 'bg-nhs-orange/15 text-amber-800',
                    reason === 'deteriorating' && 'bg-nhs-orange/15 text-amber-800',
                  )}>
                    {reason === 'both' ? 'Gap + worsening' : reason === 'gap' ? 'Gap' : 'Worsening'}
                  </span>

                  <ArrowRight className="hidden h-4 w-4 text-gray-300 group-hover:text-nhs-blue sm:block" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
