'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { formatValue, formatConfidenceInterval } from '@/lib/utils/format';
import { isOutcomeIndicator } from '@/lib/api/indicators';

interface IndicatorCardProps {
  indicator: Indicator;
  data?: IndicatorRawData;
  timePeriodId: number;
}

export function IndicatorCard({ indicator, data, timePeriodId }: IndicatorCardProps) {
  const isOutcome = isOutcomeIndicator(indicator);

  return (
    <Link href={`/indicators/${indicator.IndicatorID}?timePeriod=${timePeriodId}`}>
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium leading-tight">
              {indicator.IndicatorShortName}
            </CardTitle>
            <Badge variant={isOutcome ? 'secondary' : 'default'} className="shrink-0 text-xs">
              {isOutcome ? 'Outcome' : 'Standard'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {data ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {formatValue(data.Value, indicator.FormatDisplayName)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatConfidenceInterval(data.LowerCI, data.UpperCI)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{indicator.FormatDisplayName}</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
