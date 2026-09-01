'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue, formatAbsDiff } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildFocusSignals, type FocusReason } from '@/lib/utils/focus-signals';

interface PrioritiesCardProps {
  indicators: IndicatorWithData[];
  baselineIndicators: IndicatorWithData[];
  baselineName: string;
  maxItems?: number;
  isLoadingBaseline?: boolean;
}

function cleanName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

function reasonLabel(reason: FocusReason, baselineName: string) {
  if (reason === 'worst-peer-fifth') return 'Worst peer fifth';
  if (reason === 'second-worst-peer-fifth') return 'Second-worst peer fifth';
  if (reason === 'comparison') return `Worse than ${baselineName}`;
  return 'Worsening';
}

export function PrioritiesCard({
  indicators,
  baselineIndicators,
  baselineName,
  maxItems = 5,
  isLoadingBaseline = false,
}: PrioritiesCardProps) {
  const searchParams = useSearchParams();

  const priorities = useMemo(
    () => buildFocusSignals(indicators, baselineIndicators, maxItems),
    [indicators, baselineIndicators, maxItems],
  );

  const criteria = 'Combines peer position, the selected comparison and change over the latest two periods. Recorded prevalence uses age-standardised results.';

  return (
    <section aria-labelledby="priorities-heading" className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 id="priorities-heading" className="text-base font-semibold text-gray-900">Focus signals</h2>
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
          No indicators meet the focus-signal criteria.
        </div>
      ) : (
        <ol className="divide-y divide-gray-100">
          {priorities.map(({ indicator, value, baselineValue, gap, trend, reasons, section, lowerIsBetter, isRecordedPrevalence, usesAgeStandardised }, i) => {
            const fmt = indicator.FormatDisplayName;
            const gapIsBad = gap !== null && (lowerIsBetter ? gap > 0 : gap < 0);
            const trendIsBad = trend !== null && (lowerIsBetter ? trend > 0 : trend < 0);
            const showTrend = reasons.includes('deteriorating');

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
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />
                        {section.name}
                      </span>
                      {usesAgeStandardised && <span>Age-standardised</span>}
                      {gap !== null && (
                        <span className={cn(gapIsBad ? 'text-nhs-red' : 'text-nhs-green')}>
                          {formatAbsDiff(gap, fmt)} {isRecordedPrevalence
                            ? `${gap < 0 ? 'lower than' : 'higher than'} ${baselineName}`
                            : `${gapIsBad ? 'behind' : 'ahead of'} ${baselineName}`}
                        </span>
                      )}
                      {showTrend && (
                        <span className={cn(trendIsBad ? 'text-nhs-red' : 'text-nhs-green')}>
                          {trend! > 0 ? '↑' : '↓'} {formatAbsDiff(trend!, fmt)} since last period
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-sm tabular-nums sm:text-right">
                    <span className="font-semibold text-gray-900">{formatValue(value, fmt)}</span>
                    {baselineValue !== null && (
                      <span className="text-gray-400"> vs {formatValue(baselineValue, fmt)}</span>
                    )}
                  </div>

                  <span className={cn(
                    'w-fit rounded px-1.5 py-0.5 text-[11px] font-medium',
                    isRecordedPrevalence
                      ? 'bg-nhs-orange/15 text-amber-800'
                      : 'bg-nhs-red/10 text-nhs-red',
                  )}>
                    {isRecordedPrevalence
                      ? 'Possible under-detection'
                      : reasons.map(reason => reasonLabel(reason, baselineName)).join(' · ')}
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
