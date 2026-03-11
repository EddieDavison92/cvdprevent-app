'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConditionPathway, PathwayStage } from '@/lib/constants/pathways';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue } from '@/lib/utils/format';
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PathwayFunnelProps {
  pathway: ConditionPathway;
  indicators: IndicatorWithData[];
  baselineIndicators?: IndicatorWithData[];
  baselineName?: string;
  areaName: string;
}

interface StageData {
  stage: PathwayStage;
  value: number | null;
  baselineValue: number | null;
  gap: number | null;
  indicatorName: string;
}

function getPersonsValue(indicator: IndicatorWithData): number | null {
  const persons = indicator.Categories.find(
    c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
  return persons?.Data.Value ?? null;
}

export function PathwayFunnel({
  pathway,
  indicators,
  baselineIndicators = [],
  baselineName = 'England',
  areaName,
}: PathwayFunnelProps) {
  // Map indicator codes to data
  const indicatorMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of indicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [indicators]);

  const baselineMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of baselineIndicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [baselineIndicators]);

  // Build stage data
  const stageData: StageData[] = useMemo(() => {
    return pathway.stages.map(stage => {
      // For stages with multiple indicators, take the first one that has data
      // (could also average them or pick the primary one)
      let value: number | null = null;
      let baselineValue: number | null = null;
      let indicatorName = stage.name;

      for (const code of stage.indicatorCodes) {
        const ind = indicatorMap.get(code);
        if (ind) {
          const v = getPersonsValue(ind);
          if (v !== null) {
            value = v;
            indicatorName = ind.IndicatorShortName;
            
            const baseInd = baselineMap.get(code);
            if (baseInd) {
              baselineValue = getPersonsValue(baseInd);
            }
            break;
          }
        }
      }

      const gap = value !== null && baselineValue !== null ? value - baselineValue : null;

      return { stage, value, baselineValue, gap, indicatorName };
    });
  }, [pathway.stages, indicatorMap, baselineMap]);

  // Find biggest gap (worst performing stage)
  const worstStage = useMemo(() => {
    let worst: StageData | null = null;
    let worstGap = 0;

    for (const sd of stageData) {
      if (sd.gap === null) continue;
      
      // For "higherIsBetter: false" (detection gaps), negative gap is good
      // For "higherIsBetter: true", positive gap is good
      const effectiveGap = sd.stage.higherIsBetter ? sd.gap : -sd.gap;
      
      if (effectiveGap < worstGap) {
        worstGap = effectiveGap;
        worst = sd;
      }
    }

    return worst;
  }, [stageData]);

  const formatFn = (v: number) => formatValue(v, '%');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pathway.color }}
              />
              {pathway.name} Pathway
            </CardTitle>
            <CardDescription>{pathway.description}</CardDescription>
          </div>
          {worstStage && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Focus: {worstStage.stage.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Funnel visualization */}
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {stageData.map((sd, idx) => {
            const isWorst = sd === worstStage;
            const gapDirection = sd.gap !== null && sd.stage.higherIsBetter
              ? (sd.gap > 0.5 ? 'above' : sd.gap < -0.5 ? 'below' : 'at')
              : sd.gap !== null && !sd.stage.higherIsBetter
                ? (sd.gap < -0.5 ? 'above' : sd.gap > 0.5 ? 'below' : 'at')
                : null;

            return (
              <div key={sd.stage.id} className="flex items-center">
                <div
                  className={cn(
                    'flex-1 min-w-[140px] p-3 rounded-lg border-2 transition-all',
                    isWorst ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white',
                    gapDirection === 'above' && 'border-green-300',
                    gapDirection === 'below' && 'border-red-300',
                  )}
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {sd.stage.type}
                    </span>
                    {gapDirection === 'above' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    {gapDirection === 'below' && <TrendingDown className="w-4 h-4 text-red-600" />}
                  </div>

                  {/* Stage name */}
                  <div className="font-semibold text-gray-900 mb-1">
                    {sd.stage.name}
                  </div>

                  {/* Value */}
                  <div className="text-2xl font-bold" style={{ color: pathway.color }}>
                    {sd.value !== null ? formatFn(sd.value) : '—'}
                  </div>

                  {/* Baseline comparison */}
                  {sd.baselineValue !== null && sd.gap !== null && (
                    <div className={cn(
                      'text-xs mt-1',
                      gapDirection === 'above' ? 'text-green-600' :
                      gapDirection === 'below' ? 'text-red-600' : 'text-gray-500'
                    )}>
                      {sd.gap > 0 ? '+' : ''}{sd.gap.toFixed(1)}pp vs {baselineName}
                    </div>
                  )}

                  {/* Description tooltip trigger */}
                  <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {sd.stage.description}
                  </div>
                </div>

                {/* Arrow between stages */}
                {idx < stageData.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-300 mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary insight */}
        {worstStage && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-amber-800">Priority area: </span>
                <span className="text-amber-700">
                  {worstStage.indicatorName} is {Math.abs(worstStage.gap!).toFixed(1)}pp 
                  {worstStage.stage.higherIsBetter 
                    ? (worstStage.gap! < 0 ? ' below ' : ' above ')
                    : (worstStage.gap! > 0 ? ' worse than ' : ' better than ')
                  }
                  {baselineName}. {worstStage.stage.higherIsBetter && worstStage.gap! < 0 
                    ? 'Improving this could have significant downstream impact.'
                    : !worstStage.stage.higherIsBetter && worstStage.gap! > 0
                      ? 'More undiagnosed patients than average suggests detection gap.'
                      : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
