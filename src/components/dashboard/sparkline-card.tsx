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
}

function cleanName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

export function SparklineCard({ indicator, sectionColor, lowerIsBetter }: SparklineCardProps) {
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
      className="block group"
    >
      <div className={cn(
        'rounded-lg border bg-white p-3 transition-all',
        'hover:shadow-sm hover:border-[#005EB8]/30',
      )}>
        {/* Name + trend icon */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-700 truncate group-hover:text-[#005EB8]">
            {cleanName(indicator.IndicatorShortName)}
          </span>
          {trendDirection === 'up' && (
            <TrendingUp className={cn('w-3.5 h-3.5 flex-shrink-0', trendGood ? 'text-green-500' : 'text-red-500')} />
          )}
          {trendDirection === 'down' && (
            <TrendingDown className={cn('w-3.5 h-3.5 flex-shrink-0', trendGood ? 'text-green-500' : 'text-red-500')} />
          )}
          {trendDirection === 'flat' && (
            <Minus className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          )}
        </div>

        {/* Sparkline */}
        <Sparkline
          data={chartData}
          color={sectionColor}
          height={56}
          className="w-full"
        />

        {/* Value + % change */}
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-sm font-semibold tabular-nums text-gray-900">
            {value !== null ? formatValue(value, indicator.FormatDisplayName) : '—'}
          </span>
          {pctChange !== null && trendDirection !== 'flat' && (
            <span className={cn(
              'text-[11px] tabular-nums',
              trendGood ? 'text-green-600' : 'text-red-600',
            )}>
              {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
            </span>
          )}
          {trendDirection === 'flat' && (
            <span className="text-[11px] text-gray-400">Stable</span>
          )}
        </div>
      </div>
    </Link>
  );
}
