'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IndicatorWithData } from '@/lib/api/types';
import { DASHBOARD_SECTIONS } from '@/lib/constants/indicator-sections';
import { formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { AlertTriangle, TrendingDown, Target, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrioritiesCardProps {
  indicators: IndicatorWithData[];
  baselineIndicators: IndicatorWithData[];
  baselineName: string;
  maxItems?: number;
  isLoadingBaseline?: boolean;
}

interface PriorityItem {
  indicator: IndicatorWithData;
  value: number;
  baselineValue: number;
  gap: number;
  trend: number | null;
  reason: 'gap' | 'deteriorating' | 'both';
  section: typeof DASHBOARD_SECTIONS[0] | undefined;
}

function getPersonsData(indicator: IndicatorWithData) {
  return indicator.Categories.find(
    c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
}

export function PrioritiesCard({
  indicators,
  baselineIndicators,
  baselineName,
  maxItems = 5,
  isLoadingBaseline = false,
}: PrioritiesCardProps) {
  const searchParams = useSearchParams();

  // Build baseline map
  const baselineMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of baselineIndicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [baselineIndicators]);

  // Find priority indicators
  const priorities: PriorityItem[] = useMemo(() => {
    const items: PriorityItem[] = [];

    for (const indicator of indicators) {
      const persons = getPersonsData(indicator);
      if (!persons || persons.Data.Value === null) continue;

      const value = persons.Data.Value;
      
      // Get baseline
      const baselineInd = baselineMap.get(indicator.IndicatorCode);
      const baselinePersons = baselineInd ? getPersonsData(baselineInd) : null;
      if (!baselinePersons || baselinePersons.Data.Value === null) continue;
      
      const baselineValue = baselinePersons.Data.Value;
      const gap = value - baselineValue;

      // Get trend
      let trend: number | null = null;
      if (persons.TimeSeries && persons.TimeSeries.length >= 2) {
        const prev = persons.TimeSeries[persons.TimeSeries.length - 2]?.Value;
        if (prev !== null && prev !== undefined) {
          trend = value - prev;
        }
      }

      // Find which section this belongs to
      const section = DASHBOARD_SECTIONS.find(s => 
        s.indicatorCodes.includes(indicator.IndicatorCode)
      );

      // Determine if this is a priority
      // For "lowerIsBetter" sections, positive gap is bad
      // For normal sections, negative gap is bad
      const lowerIsBetter = section?.lowerIsBetter ?? false;
      const effectiveGap = lowerIsBetter ? gap : -gap;
      const isSignificantGap = effectiveGap > 2; // More than 2pp below average

      // For trend, deteriorating means:
      // - For lowerIsBetter: trend going UP is bad
      // - For normal: trend going DOWN is bad  
      const isDeteriorating = trend !== null && (
        lowerIsBetter ? trend > 1 : trend < -1
      );

      if (isSignificantGap || isDeteriorating) {
        items.push({
          indicator,
          value,
          baselineValue,
          gap,
          trend,
          reason: isSignificantGap && isDeteriorating ? 'both' : 
                  isSignificantGap ? 'gap' : 'deteriorating',
          section,
        });
      }
    }

    // Sort by severity: both > gap size > deteriorating
    items.sort((a, b) => {
      if (a.reason === 'both' && b.reason !== 'both') return -1;
      if (b.reason === 'both' && a.reason !== 'both') return 1;
      
      // Then by gap size
      const aEffective = (a.section?.lowerIsBetter ? a.gap : -a.gap);
      const bEffective = (b.section?.lowerIsBetter ? b.gap : -b.gap);
      return bEffective - aEffective;
    });

    return items.slice(0, maxItems);
  }, [indicators, baselineMap, maxItems]);

  if (isLoadingBaseline) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Comparing to {baselineName}...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (priorities.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-green-700">
            <Target className="w-5 h-5" />
            <span className="font-medium">Looking good! No significant gaps or deteriorating trends.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatFn = (v: number) => formatValue(v, '%');

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/80 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-base">Priority Areas</CardTitle>
        </div>
        <CardDescription>
          Indicators needing attention — biggest gaps and deteriorating trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {priorities.map(({ indicator, value, baselineValue, gap, trend, reason, section }) => {
            const lowerIsBetter = section?.lowerIsBetter ?? false;
            
            return (
              <Link
                key={indicator.IndicatorID}
                href={buildUrl(`/dashboard/${indicator.IndicatorID}`, searchParams)}
                className="block"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-white hover:bg-amber-50/50 transition-colors">
                  {/* Icon based on reason */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    reason === 'both' ? 'bg-red-100' :
                    reason === 'gap' ? 'bg-amber-100' : 'bg-orange-100'
                  )}>
                    {reason === 'deteriorating' || reason === 'both' ? (
                      <TrendingDown className={cn(
                        'w-4 h-4',
                        reason === 'both' ? 'text-red-600' : 'text-orange-600'
                      )} />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>

                  {/* Indicator info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {indicator.IndicatorShortName
                        .replace(/\(CVDP\d+[A-Z]+\)/, '')
                        .trim()}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{formatFn(value)}</span>
                      <span className="text-gray-300">•</span>
                      <span className={lowerIsBetter ? (gap > 0 ? 'text-red-600' : 'text-green-600') : (gap < 0 ? 'text-red-600' : 'text-green-600')}>
                        {gap > 0 ? '+' : ''}{gap.toFixed(1)}pp vs {baselineName}
                      </span>
                      {trend !== null && Math.abs(trend) > 0.5 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className={lowerIsBetter ? (trend > 0 ? 'text-red-600' : 'text-green-600') : (trend < 0 ? 'text-red-600' : 'text-green-600')}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}pp
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1">
                    {(reason === 'gap' || reason === 'both') && (
                      <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
                        Gap
                      </Badge>
                    )}
                    {(reason === 'deteriorating' || reason === 'both') && (
                      <Badge variant="outline" className="text-xs border-orange-300 bg-orange-50 text-orange-700">
                        Trending ↓
                      </Badge>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
