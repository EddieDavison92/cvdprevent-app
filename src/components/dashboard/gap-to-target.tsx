'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { formatValue } from '@/lib/utils/format';

interface GapToTargetProps {
  indicatorName: string;
  orgValue: number | null;
  orgNumerator: number | null;
  orgDenominator: number | null;
  baselineValue: number | null;
  baselineName?: string;
  formatDisplay?: string;
  /** Higher is better (e.g., detection rate) vs lower is better (e.g., uncontrolled %) */
  higherIsBetter?: boolean;
}

interface GapAnalysis {
  gap: number;
  gapPercent: number;
  patientsNeeded: number;
  direction: 'above' | 'below' | 'at';
  actionVerb: string;
}

export function GapToTarget({
  indicatorName,
  orgValue,
  orgNumerator,
  orgDenominator,
  baselineValue,
  baselineName = 'England',
  formatDisplay = '%',
  higherIsBetter = true,
}: GapToTargetProps) {
  const analysis = useMemo((): GapAnalysis | null => {
    if (orgValue === null || baselineValue === null || orgDenominator === null || orgNumerator === null) {
      return null;
    }

    const gap = orgValue - baselineValue;
    const gapPercent = baselineValue !== 0 ? (gap / baselineValue) * 100 : 0;
    
    // Determine if we're above, below, or at average
    const threshold = 0.5; // Within 0.5 percentage points = at average
    let direction: 'above' | 'below' | 'at';
    if (Math.abs(gap) < threshold) {
      direction = 'at';
    } else if (higherIsBetter) {
      direction = gap > 0 ? 'above' : 'below';
    } else {
      direction = gap < 0 ? 'above' : 'below';
    }

    // Calculate patients needed to reach baseline average
    // If org is at 60% and baseline is at 65%, with denominator of 1000:
    // Current numerator: 600, Target numerator: 650, Need: 50 more
    const targetNumerator = (baselineValue / 100) * orgDenominator;
    const patientsNeeded = Math.abs(Math.round(targetNumerator - orgNumerator));

    const actionVerb = higherIsBetter
      ? (direction === 'below' ? 'treat/detect' : 'fewer needed')
      : (direction === 'below' ? 'reduce by' : 'above average');

    return {
      gap: Math.abs(gap),
      gapPercent: Math.abs(gapPercent),
      patientsNeeded,
      direction,
      actionVerb,
    };
  }, [orgValue, orgNumerator, orgDenominator, baselineValue, higherIsBetter]);

  if (!analysis) {
    return null;
  }

  const isAtOrAboveAverage = analysis.direction === 'at' || 
    (higherIsBetter && analysis.direction === 'above') ||
    (!higherIsBetter && analysis.direction === 'below');

  return (
    <Card className={isAtOrAboveAverage ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Gap to {baselineName} Average
          </CardTitle>
          <Badge variant={isAtOrAboveAverage ? 'default' : 'secondary'} className={isAtOrAboveAverage ? 'bg-green-600' : 'bg-amber-600'}>
            {analysis.direction === 'at' ? 'At Average' : analysis.direction === 'above' ? 'Above' : 'Below'}
          </Badge>
        </div>
        <CardDescription className="text-xs">{indicatorName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current vs Average */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Your Value</div>
            <div className="text-lg font-semibold">{formatValue(orgValue!, formatDisplay)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{baselineName} Average</div>
            <div className="text-lg font-semibold">{formatValue(baselineValue!, formatDisplay)}</div>
          </div>
        </div>

        {/* Gap Details */}
        {!isAtOrAboveAverage && (
          <div className="rounded-lg bg-white p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>
                Gap: <strong>{formatValue(analysis.gap, formatDisplay)}</strong>
                <span className="text-muted-foreground ml-1">
                  ({analysis.gapPercent.toFixed(1)}% {analysis.direction === 'below' ? 'below' : 'above'} average)
                </span>
              </span>
            </div>
            
            {analysis.patientsNeeded > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>{analysis.patientsNeeded.toLocaleString()}</strong> more patients to {analysis.actionVerb} to reach average
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Based on denominator of {orgDenominator?.toLocaleString()} patients. 
                Reaching {baselineName} average would require {((baselineValue! / 100) * orgDenominator!).toLocaleString()} in numerator 
                (currently {orgNumerator?.toLocaleString()}).
              </span>
            </div>
          </div>
        )}

        {isAtOrAboveAverage && (
          <div className="rounded-lg bg-white p-3 text-sm text-green-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {analysis.direction === 'at' 
              ? `You're performing at the ${baselineName} average`
              : `You're performing ${formatValue(analysis.gap, formatDisplay)} ${higherIsBetter ? 'above' : 'below'} the ${baselineName} average`
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
