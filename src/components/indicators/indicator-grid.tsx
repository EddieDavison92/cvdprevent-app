'use client';

import { IndicatorCard } from './indicator-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';

interface IndicatorGridProps {
  indicators: Indicator[] | undefined;
  dataByIndicator?: Map<number, IndicatorRawData>;
  timePeriodId: number;
  isLoading?: boolean;
}

export function IndicatorGrid({ indicators, dataByIndicator, timePeriodId, isLoading }: IndicatorGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(12)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!indicators || indicators.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No indicators available for this selection.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {indicators.map((indicator) => (
        <IndicatorCard
          key={indicator.IndicatorID}
          indicator={indicator}
          data={dataByIndicator?.get(indicator.IndicatorID)}
          timePeriodId={timePeriodId}
        />
      ))}
    </div>
  );
}
