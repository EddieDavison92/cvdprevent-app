'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sparkline } from '@/components/charts/sparkline';
import { getPersonsData } from '@/lib/hooks/use-area-indicators';
import { formatDiff, formatTimePeriod, formatValue } from '@/lib/utils/format';
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

  const { chartData, value, overallChange, latestChange, trendDirection, trendGood } = useMemo(() => {
    const persons = getPersonsData(indicator);
    if (!persons) return { chartData: [], value: null, overallChange: null, latestChange: null, trendDirection: null, trendGood: false };

    const ts = persons.TimeSeries
      ?.slice()
      .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime()) ?? [];

    const chartData = ts.map((p) => ({
      x: formatTimePeriod(p.TimePeriodName),
      y: p.Value,
    }));

    const value = persons.Data.Value;

    const trend = summariseTrend(ts.map((p) => p.Value));
    const dir = trend.overall?.direction ?? null;
    const good = lowerIsBetter ? dir === 'down' : dir === 'up';

    return {
      chartData,
      value,
      overallChange: trend.overall?.change ?? null,
      latestChange: trend.values.length > 2 ? trend.latest?.change ?? null : null,
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
            {overallChange !== null && trendDirection !== 'flat' ? ` ${formatDiff(overallChange, indicator.FormatDisplayName)}` : ''}
          </span>
          {latestChange !== null && (
            <span className="text-gray-400">· last period {formatDiff(latestChange, indicator.FormatDisplayName)}</span>
          )}
        </div>
      </div>

      <div className="opacity-80 transition-opacity group-hover:opacity-100">
        <Sparkline
          data={chartData}
          color={sectionColor}
          height={34}
          className="w-full"
        />
      </div>

      <span className="text-sm font-semibold tabular-nums text-gray-900">
        {value !== null ? formatValue(value, indicator.FormatDisplayName) : '—'}
      </span>
    </Link>
  );
}
