'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ComparisonBadge } from './comparison-badge';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { isOutcomeIndicator } from '@/lib/api/indicators';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IndicatorSummaryCardProps {
  indicator: Indicator;
  data?: IndicatorRawData;
  previousData?: IndicatorRawData;
  baselineData?: IndicatorRawData;
  baselineName?: string;
  isEngland?: boolean;
  isLoading?: boolean;
}

export function IndicatorSummaryCard({
  indicator,
  data,
  previousData,
  baselineData,
  baselineName = 'average',
  isEngland,
  isLoading,
}: IndicatorSummaryCardProps) {
  const searchParams = useSearchParams();
  const isOutcome = isOutcomeIndicator(indicator);

  // Calculate trend from previous period
  const trend =
    data?.Value !== null && previousData?.Value !== null && data?.Value !== undefined && previousData?.Value !== undefined
      ? data.Value - previousData.Value
      : null;

  const TrendIcon = trend !== null ? (trend > 0.1 ? TrendingUp : trend < -0.1 ? TrendingDown : Minus) : null;
  const trendColor = trend !== null ? (trend > 0.1 ? 'text-green-600' : trend < -0.1 ? 'text-red-600' : 'text-gray-400') : '';

  return (
    <Link href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}>
      <Card className="flex h-full min-h-[160px] flex-col transition-all hover:border-[#005EB8]/50 hover:shadow-md">
        {/* Title section - fixed height area */}
        <CardHeader className="flex-none pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-3 min-h-[3.5rem] text-sm font-medium leading-tight text-gray-700">
              {indicator.IndicatorShortName}
            </CardTitle>
            <Badge
              variant={isOutcome ? 'secondary' : 'default'}
              className="shrink-0 text-xs"
            >
              {isOutcome ? 'Outcome' : 'Standard'}
            </Badge>
          </div>
        </CardHeader>
        {/* Content section - pushed to bottom */}
        <CardContent className="mt-auto space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ) : data?.Value !== null && data?.Value !== undefined ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#005EB8]">
                  {formatValue(data.Value, indicator.FormatDisplayName)}
                </span>
                {TrendIcon && trend !== null && (
                  <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(trend).toFixed(1)}
                  </span>
                )}
              </div>

              {!isEngland && (
                <ComparisonBadge 
                  orgValue={data.Value} 
                  baselineValue={baselineData?.Value} 
                  baselineName={baselineName}
                />
              )}

              {isEngland && baselineData && (
                <p className="text-xs text-gray-500">National average</p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{indicator.FormatDisplayName}</span>
              <ArrowRight className="h-4 w-4 text-[#005EB8]" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
