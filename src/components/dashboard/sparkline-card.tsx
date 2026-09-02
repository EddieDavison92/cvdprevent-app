'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TrendSparkline } from '@/components/charts/trend-sparkline';
import { getPersonsData } from '@/lib/hooks/use-area-indicators';
import { formatDiff, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import type { IndicatorWithData } from '@/lib/api/types';
import { summariseTrend } from '@/lib/utils/trend';

interface SparklineCardProps {
  indicator: IndicatorWithData;
  sectionColor: string;
  lowerIsBetter: boolean;
  recordedPrevalence?: boolean;
}

function cleanName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

export function SparklineCard({ indicator, sectionColor, lowerIsBetter, recordedPrevalence = false }: SparklineCardProps) {
  const searchParams = useSearchParams();

  const { chartData, medianData, value, recentChange, trendDirection, trendGood } = useMemo(() => {
    const persons = getPersonsData(indicator);
    if (!persons) return { chartData: [], medianData: [], value: null, recentChange: null, trendDirection: null, trendGood: false };

    const ts = persons.TimeSeries
      ?.slice()
      .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime()) ?? [];

    const chartData = ts.map((p) => p.Value);
    const medianData = ts.map((p) => p.Median ?? null);

    const value = persons.Data.Value;

    const trend = summariseTrend(ts.map((p) => p.Value));
    const dir = trend.latest?.direction ?? null;
    const good = lowerIsBetter ? dir === 'down' : dir === 'up';

    return {
      chartData,
      medianData,
      value,
      recentChange: trend.latest?.change ?? null,
      trendDirection: dir,
      trendGood: good,
    };
  }, [indicator, lowerIsBetter]);

  return (
    <Link
      href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
      className="group grid min-h-16 grid-cols-[minmax(0,1fr)_88px_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none"
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-800 group-hover:text-nhs-blue" title={cleanName(indicator.IndicatorShortName)}>
          {cleanName(indicator.IndicatorShortName)}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          <span className={cn(
            trendDirection === null || trendDirection === 'flat'
              ? 'text-gray-500'
              : recordedPrevalence
                ? 'text-nhs-blue'
                : trendGood
                  ? 'text-nhs-green'
                  : 'text-nhs-red'
          )}>
            {trendDirection === null
              ? 'Not enough history'
              : trendDirection === 'flat'
                ? 'Stable'
                : recordedPrevalence
                  ? (trendDirection === 'up' ? 'Rising' : 'Falling')
                  : trendGood
                    ? 'Improving'
                    : 'Deteriorating'}
            {recentChange !== null && trendDirection !== 'flat' ? ` ${formatDiff(recentChange, indicator.FormatDisplayName)}` : ''}
          </span>
        </div>
      </div>

      <div className="flex justify-center opacity-80 transition-opacity group-hover:opacity-100">
        <TrendSparkline values={chartData} reference={medianData} color={sectionColor} />
      </div>

      <span className="text-sm font-semibold tabular-nums text-gray-900">
        {value !== null ? formatValue(value, indicator.FormatDisplayName) : '—'}
      </span>
    </Link>
  );
}
