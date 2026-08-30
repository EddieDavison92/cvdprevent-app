'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { getPersonsData } from '@/lib/hooks/use-area-indicators';
import { formatTimePeriod, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import type { IndicatorWithData } from '@/lib/api/types';

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

  const { chartData, value, pctChange, trendDirection, trendGood } = useMemo(() => {
    const persons = getPersonsData(indicator);
    if (!persons) return { chartData: [], value: null, pctChange: null, trendDirection: null, trendGood: false };

    const ts = persons.TimeSeries
      ?.slice()
      .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime()) ?? [];

    const chartData = ts.map((p) => ({
      x: formatTimePeriod(p.TimePeriodName),
      y: p.Value,
    }));

    const value = persons.Data.Value;

    // Overall trend: compare first third avg to last third avg (smooths outliers)
    const validPoints = ts.filter((p) => p.Value !== null).map((p) => p.Value!);
    let pctChange: number | null = null;
    let dir: 'up' | 'down' | 'flat' | null = null;

    if (validPoints.length >= 3) {
      const third = Math.max(1, Math.floor(validPoints.length / 3));
      const earlyAvg = validPoints.slice(0, third).reduce((s, v) => s + v, 0) / third;
      const lateAvg = validPoints.slice(-third).reduce((s, v) => s + v, 0) / third;
      pctChange = earlyAvg !== 0 ? ((lateAvg - earlyAvg) / Math.abs(earlyAvg)) * 100 : 0;
    } else if (validPoints.length === 2) {
      pctChange = validPoints[0] !== 0
        ? ((validPoints[1] - validPoints[0]) / Math.abs(validPoints[0])) * 100
        : 0;
    }

    if (pctChange !== null) {
      dir = Math.abs(pctChange) < 1 ? 'flat' : pctChange > 0 ? 'up' : 'down';
    }

    // For polarity: "good" means improving
    const good = lowerIsBetter ? dir === 'down' : dir === 'up';

    return { chartData, value, pctChange, trendDirection: dir, trendGood: good };
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
          {trendDirection === 'up' && <TrendingUp className={cn('h-3.5 w-3.5', recordedPrevalence ? 'text-nhs-blue' : trendGood ? 'text-nhs-green' : 'text-nhs-red')} />}
          {trendDirection === 'down' && <TrendingDown className={cn('h-3.5 w-3.5', recordedPrevalence ? 'text-nhs-blue' : trendGood ? 'text-nhs-green' : 'text-nhs-red')} />}
          {trendDirection === 'flat' && <Minus className="h-3.5 w-3.5 text-gray-400" />}
          <span className={cn(trendDirection === 'flat' ? 'text-gray-500' : recordedPrevalence ? 'text-nhs-blue' : trendGood ? 'text-nhs-green' : 'text-nhs-red')}>
            {trendDirection === 'flat' ? 'Stable' : recordedPrevalence ? (trendDirection === 'up' ? 'Rising' : 'Falling') : trendGood ? 'Improving' : 'Deteriorating'}
            {pctChange !== null && trendDirection !== 'flat' ? ` · ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%` : ''}
          </span>
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
