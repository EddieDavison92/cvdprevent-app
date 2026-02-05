'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { formatValue, formatNumber } from '@/lib/utils/format';
import { TrendingUp, TrendingDown, Minus, Users, Hash, BarChart3, Activity } from 'lucide-react';

interface HeroSectionProps {
  indicator: Indicator;
  areaData?: IndicatorRawData;
  baselineData?: IndicatorRawData;
  baselineName?: string;
  previousData?: IndicatorRawData;
  areaName: string;
  isEngland?: boolean;
  rank?: { position: number; total: number; levelName: string } | null;
  timePeriodLabel?: string;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function HeroSection({
  indicator,
  areaData,
  baselineData,
  baselineName = 'England',
  previousData,
  areaName,
  isEngland,
  rank,
  timePeriodLabel,
}: HeroSectionProps) {
  const fmt = (v: number) => formatValue(v, indicator.FormatDisplayName);
  const isPercentage = indicator.FormatDisplayName?.includes('%');
  const diffSuffix = isPercentage ? 'pp' : '';

  const trend =
    areaData?.Value !== null &&
    previousData?.Value !== null &&
    areaData?.Value !== undefined &&
    previousData?.Value !== undefined
      ? areaData.Value - previousData.Value
      : null;

  const gap = areaData?.Value != null && baselineData?.Value != null
    ? areaData.Value - baselineData.Value
    : null;

  const hasValue = areaData?.Value !== null && areaData?.Value !== undefined;

  // Use relative threshold (0.25% of baseline value) for significance
  const baseVal = baselineData?.Value ?? 0;
  const gapIsSignificant = gap !== null && baseVal !== 0 && (Math.abs(gap) / baseVal) * 100 > 0.25;

  const gapColor = gapIsSignificant
    ? (gap! > 0 ? 'text-green-700' : 'text-red-700')
    : 'text-gray-900';
  const gapBg = gapIsSignificant
    ? (gap! > 0 ? 'bg-green-50' : 'bg-red-50')
    : 'bg-gray-50';

  // Use relative threshold for trend stability (0.25% of area value)
  const areaVal = areaData?.Value ?? 0;
  const trendThreshold = areaVal !== 0 ? Math.abs(areaVal) * 0.0025 : 0.1;
  const trendDirection = trend !== null ? (trend > trendThreshold ? 'up' : trend < -trendThreshold ? 'down' : 'flat') : null;
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const trendColor = trendDirection === 'up' ? 'text-green-700' : trendDirection === 'down' ? 'text-red-700' : 'text-gray-900';
  const trendBg = trendDirection === 'up' ? 'bg-green-50' : trendDirection === 'down' ? 'bg-red-50' : 'bg-gray-50';

  const rankQuartile = rank
    ? (rank.position <= Math.ceil(rank.total * 0.25) ? 'Top quartile'
      : rank.position <= Math.ceil(rank.total * 0.5) ? 'Upper half'
        : rank.position <= Math.ceil(rank.total * 0.75) ? 'Lower half'
          : 'Bottom quartile')
    : null;

  const showRank = !!rank;

  const gridCols = isEngland ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';

  return (
    <div>
      {timePeriodLabel && (
        <p className="text-xs text-gray-500 mb-2 font-medium">Period: {timePeriodLabel}</p>
      )}
      <div className={`grid gap-3 ${gridCols}`}>
        {/* Area value */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <BarChart3 className="h-3 w-3" />
              {isEngland ? 'England' : areaName}
            </div>
            <div className="text-2xl font-bold text-[#005EB8]">
              {hasValue ? fmt(areaData!.Value!) : 'N/A'}
            </div>
          </CardContent>
        </Card>

        {/* Baseline benchmark */}
        {!isEngland && (
          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <BarChart3 className="h-3 w-3" />
                {baselineName}
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {baselineData?.Value != null ? fmt(baselineData.Value) : 'N/A'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gap to baseline — only show when the gap is meaningful */}
        {!isEngland && gap !== null && (
          <Card className={gapBg}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Activity className="h-3 w-3" />
                vs {baselineName}
              </div>
              <div className={`text-xl font-bold ${gapColor}`}>
                {gapIsSignificant
                  ? `${gap > 0 ? '+' : ''}${gap.toFixed(1)}${diffSuffix}`
                  : 'Similar'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend */}
        {trend !== null && (
          <Card className={trendBg}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <TrendIcon className="h-3 w-3" />
                Trend
              </div>
              <div className={`text-xl font-bold ${trendColor}`}>
                {trendDirection === 'flat'
                  ? 'Stable'
                  : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}${diffSuffix}`}
              </div>
              {trendDirection !== 'flat' && (
                <div className={`text-xs ${trendColor} opacity-75`}>
                  from previous period
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rank — only show when there are enough peers to be meaningful */}
        {!isEngland && showRank && (
          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Hash className="h-3 w-3" />
                Peer rank
              </div>
              <div className="text-xl font-bold text-gray-700">
                {getOrdinal(rank!.position)} <span className="text-sm font-normal text-gray-400">/ {rank!.total}</span>
              </div>
              <div className="text-xs text-gray-500">{rankQuartile}</div>
            </CardContent>
          </Card>
        )}

        {/* Population */}
        {areaData?.Numerator != null && areaData?.Denominator != null && (
          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users className="h-3 w-3" />
                Patients
              </div>
              <div className="text-xl font-bold text-gray-700">
                {formatNumber(areaData.Numerator)}
              </div>
              <div className="text-xs text-gray-500">of {formatNumber(areaData.Denominator)}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
