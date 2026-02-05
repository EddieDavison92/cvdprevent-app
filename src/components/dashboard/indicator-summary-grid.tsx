'use client';

import { IndicatorSummaryCard } from './indicator-summary-card';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';

function SkeletonCard() {
  return (
    <Card className="flex h-full min-h-[160px] flex-col">
      <CardHeader className="flex-none pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-h-[3.5rem] space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </CardContent>
    </Card>
  );
}

interface IndicatorSummaryGridProps {
  indicators: Indicator[] | undefined;
  dataByIndicator: Map<number, IndicatorRawData>;
  previousDataByIndicator: Map<number, IndicatorRawData>;
  baselineDataByIndicator?: Map<number, IndicatorRawData>;
  baselineName?: string;
  loadingIndicators?: Set<number>;
  isLoadingIndicators?: boolean;
  isEngland?: boolean;
}

export function IndicatorSummaryGrid({
  indicators,
  dataByIndicator,
  previousDataByIndicator,
  baselineDataByIndicator,
  baselineName = 'average',
  loadingIndicators,
  isLoadingIndicators,
  isEngland,
}: IndicatorSummaryGridProps) {
  // Show skeleton grid only while fetching indicator list
  if (isLoadingIndicators) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!indicators || indicators.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <p className="text-gray-500">No indicators available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {indicators.map((indicator) => (
        <IndicatorSummaryCard
          key={indicator.IndicatorID}
          indicator={indicator}
          data={dataByIndicator.get(indicator.IndicatorID)}
          previousData={previousDataByIndicator.get(indicator.IndicatorID)}
          baselineData={baselineDataByIndicator?.get(indicator.IndicatorID)}
          baselineName={baselineName}
          isLoading={loadingIndicators?.has(indicator.IndicatorID)}
          isEngland={isEngland}
        />
      ))}
    </div>
  );
}
