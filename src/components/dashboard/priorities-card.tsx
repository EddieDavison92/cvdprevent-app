'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue, formatAbsDiff } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { CheckCircle2, ArrowRight, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildFocusSignals } from '@/lib/utils/focus-signals';
import { PeerRangeBar } from '@/components/dashboard/peer-range-bar';

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

  return (
    <section aria-labelledby="priorities-heading" className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 id="priorities-heading" className="text-base font-semibold text-gray-900">Focus signals</h2>
            {!isLoadingBaseline && priorities.length > 0 && (
              <span className="text-sm tabular-nums text-gray-500">{priorities.length} signals</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            Indicators that are clearly unfavourable against {baselineName} and sit in the lowest-performing peer fifths.
          </p>
        </div>
        <details className="group relative text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded px-2 py-1 font-medium text-nhs-blue hover:bg-nhs-pale-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue [&::-webkit-details-marker]:hidden">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            How signals are chosen
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(34rem,calc(100vw-3rem))] rounded-lg border border-gray-200 bg-white p-4 text-gray-600 shadow-lg">
            <p className="text-gray-700">
              Focus signals are screening prompts, not clinical priorities. They combine the selected comparison with position among same-level peers.
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-gray-800">Peer position</dt>
                <dd className="mt-0.5">The worst fifth appears first, followed by the second-worst fifth.</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">Selected comparison</dt>
                <dd className="mt-0.5">Only unfavourable results with non-overlapping confidence intervals against {baselineName} are included. Changing the comparison can change the signals.</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">Recent change</dt>
                <dd className="mt-0.5">Change across the latest 2 published values adds context but does not affect selection.</dd>
              </div>
            </dl>
            <p className="mt-3 text-gray-500">Recorded prevalence is excluded because higher or lower recording is not, by itself, good or bad.</p>
          </div>
        </details>
      </div>

      {isLoadingBaseline ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Comparing with {baselineName}…
        </div>
      ) : priorities.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-nhs-green">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          No indicators meet the focus-signal criteria.
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(14rem,1fr)_7rem_10rem_9rem_10rem_1rem] gap-4 border-b border-gray-100 bg-gray-50/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:grid">
            <span>Indicator</span>
            <span className="text-right">Area result</span>
            <span>Peer range</span>
            <span>Against {baselineName}</span>
            <span>Recent change</span>
            <span />
          </div>
          <ul className="divide-y divide-gray-100">
            {priorities.map(({ indicator, category, value, baselineValue, gap, trend, trendDirection, trendValues, peerBand, comparisonIsClear, section, lowerIsBetter, isRecordedPrevalence, usesAgeStandardised }) => {
              const fmt = indicator.FormatDisplayName;
              const gapIsBad = gap !== null && (lowerIsBetter ? gap > 0 : gap < 0);
              const trendIsBad = trend !== null && (lowerIsBetter ? trend > 0 : trend < 0);
              const peerLabel = peerBand === 'worst' ? 'Worst fifth' : 'Second-worst fifth';

              return (
                <li key={indicator.IndicatorID}>
                <Link
                  href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                  className="group grid gap-3 px-4 py-3 hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nhs-blue lg:grid-cols-[minmax(14rem,1fr)_7rem_10rem_9rem_10rem_1rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 group-hover:text-nhs-blue">
                      {cleanName(indicator.IndicatorShortName)}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />
                        {section.name}
                      </span>
                      {usesAgeStandardised && <span>Age-standardised</span>}
                      {isRecordedPrevalence && <span className="font-medium text-amber-800">Possible under-detection</span>}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
                    <span className="text-xs text-gray-400 lg:hidden">Area result</span>
                    <span className="text-sm font-semibold tabular-nums text-gray-900">{formatValue(value, fmt)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400 lg:hidden">Peer position</span>
                    <div className="w-full max-w-[10rem]">
                      <PeerRangeBar
                        value={value}
                        min={category.Data.Min}
                        max={category.Data.Max}
                        median={category.Data.Median}
                        quintileBounds={[category.Data.Q20, category.Data.Q40, category.Data.Q60, category.Data.Q80]}
                        status={isRecordedPrevalence ? 'recording' : 'unfavourable'}
                        formatDisplayName={fmt}
                      />
                      <span className={cn(
                        'mt-0.5 block text-[10px] font-medium',
                        peerBand === 'worst' ? 'text-nhs-red' : 'text-amber-700',
                      )}>{peerLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 text-xs lg:block">
                    <span className="text-gray-400 lg:hidden">Against {baselineName}</span>
                    {gap === null || baselineValue === null ? (
                      <span className="text-gray-400">Not available</span>
                    ) : isRecordedPrevalence ? (
                      <span>
                        <span className="block font-medium text-gray-600">{formatAbsDiff(gap, fmt)} {gap < 0 ? 'lower' : 'higher'}</span>
                        <span className="mt-0.5 block tabular-nums text-[10px] text-gray-400">{baselineName} {formatValue(baselineValue, fmt)}</span>
                      </span>
                    ) : gapIsBad && comparisonIsClear ? (
                      <span>
                        <span className="block font-medium text-nhs-red">{formatAbsDiff(gap, fmt)} worse</span>
                        <span className="mt-0.5 block tabular-nums text-[10px] text-gray-400">{baselineName} {formatValue(baselineValue, fmt)}</span>
                      </span>
                    ) : gapIsBad ? (
                      <span>
                        <span className="block font-medium text-gray-500">No clear difference</span>
                        <span className="mt-0.5 block tabular-nums text-[10px] text-gray-400">{baselineName} {formatValue(baselineValue, fmt)}</span>
                      </span>
                    ) : (
                      <span>
                        <span className="block font-medium text-nhs-green">{formatAbsDiff(gap, fmt)} better</span>
                        <span className="mt-0.5 block tabular-nums text-[10px] text-gray-400">{baselineName} {formatValue(baselineValue, fmt)}</span>
                      </span>
                    )}
                  </div>

                  <div className={cn(
                    'flex items-baseline justify-between gap-2 text-xs font-medium lg:block',
                    trendIsBad ? 'text-nhs-red' : trendDirection === 'flat' || trend === null ? 'text-gray-500' : 'text-nhs-green',
                  )}>
                    <span className="text-gray-400 lg:hidden">Recent change</span>
                    <span>
                      {trendValues.length < 2 || trend === null
                        ? 'Not enough history'
                        : isRecordedPrevalence
                          ? `${trendDirection === 'down' ? 'Falling' : trendDirection === 'up' ? 'Rising' : 'Stable'} ${trendDirection === 'flat' ? '' : formatAbsDiff(trend, fmt)}`
                          : trendDirection === 'flat'
                            ? 'Stable'
                            : `${trendIsBad ? 'Deteriorating' : 'Improving'} ${formatAbsDiff(trend, fmt)}`}
                    </span>
                  </div>

                  <ArrowRight className="hidden h-4 w-4 text-gray-300 group-hover:text-nhs-blue lg:block" aria-hidden="true" />
                </Link>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-gray-100 px-4 py-2 text-right text-[11px] text-gray-400">Ordered by peer position.</p>
        </>
      )}
    </section>
  );
}
