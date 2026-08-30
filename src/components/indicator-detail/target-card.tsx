'use client';

import { CheckCircle2, Target, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatValue } from '@/lib/utils/format';
import { analyseTarget } from '@/lib/utils/targets';
import { cn } from '@/lib/utils';

interface TargetCardProps {
  currentValue: number | null | undefined;
  targetValue: number | null | undefined;
  targetLabel: string | null | undefined;
  numerator: number | null | undefined;
  denominator: number | null | undefined;
  formatDisplayName: string;
  lowerIsBetter: boolean;
}

export function TargetCard({
  currentValue,
  targetValue,
  targetLabel,
  numerator,
  denominator,
  formatDisplayName,
  lowerIsBetter,
}: TargetCardProps) {
  const analysis = analyseTarget({
    currentValue,
    targetValue,
    numerator,
    denominator,
    lowerIsBetter,
    isPercentage: formatDisplayName.includes('%'),
  });

  if (!analysis || targetValue == null || currentValue == null) return null;

  return (
    <Card className={cn('py-0', analysis.met ? 'border-green-200 bg-green-50/60' : 'border-blue-200 bg-blue-50/60')}>
      <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn(
            'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            analysis.met ? 'bg-green-100 text-nhs-green' : 'bg-blue-100 text-nhs-blue',
          )}>
            {analysis.met ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Target className="h-4 w-4" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {analysis.met ? 'Published ambition met' : 'Published ambition'}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              {targetLabel || 'API-defined target'}: <strong>{formatValue(targetValue, formatDisplayName)}</strong>
              <span className="text-gray-400"> · current {formatValue(currentValue, formatDisplayName)}</span>
            </p>
          </div>
        </div>

        {analysis.estimatedPatients != null && (
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-blue-100 bg-white/80 px-3 py-2 text-xs text-gray-600">
            <Users className="h-4 w-4 text-nhs-blue" aria-hidden />
            <span>
              About <strong className="text-gray-900">{analysis.estimatedPatients.toLocaleString()}</strong> additional eligible patients to reach it
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
