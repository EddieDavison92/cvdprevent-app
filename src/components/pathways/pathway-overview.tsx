'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONDITION_PATHWAYS, type ConditionPathway, type PathwayStage } from '@/lib/constants/pathways';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PathwayOverviewProps {
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
  indicatorId: number | null;
  indicatorCode: string | null;
}

function getPersonsValue(indicator: IndicatorWithData): number | null {
  const persons = indicator.Categories.find(
    c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
  return persons?.Data.Value ?? null;
}

function getGapDirection(gap: number | null, higherIsBetter: boolean) {
  if (gap === null) return null;
  if (higherIsBetter) {
    return gap > 0.5 ? 'above' : gap < -0.5 ? 'below' : 'at';
  }
  return gap < -0.5 ? 'above' : gap > 0.5 ? 'below' : 'at';
}

function PathwayCard({
  pathway,
  indicatorMap,
  baselineMap,
  baselineName,
}: {
  pathway: ConditionPathway;
  indicatorMap: Map<string, IndicatorWithData>;
  baselineMap: Map<string, IndicatorWithData>;
  baselineName: string;
}) {
  const formatFn = (v: number) => formatValue(v, '%');

  const searchParams = useSearchParams();

  const stageData: StageData[] = useMemo(() => {
    return pathway.stages.map(stage => {
      let value: number | null = null;
      let baselineValue: number | null = null;
      let indicatorName = stage.name;
      let indicatorId: number | null = null;
      let indicatorCode: string | null = null;

      for (const code of stage.indicatorCodes) {
        const ind = indicatorMap.get(code);
        if (ind) {
          const v = getPersonsValue(ind);
          if (v !== null) {
            value = v;
            indicatorName = ind.IndicatorShortName
              .replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
            indicatorId = ind.IndicatorID;
            indicatorCode = code;

            const baseInd = baselineMap.get(code);
            if (baseInd) {
              baselineValue = getPersonsValue(baseInd);
            }
            break;
          }
        }
      }

      const gap = value !== null && baselineValue !== null ? value - baselineValue : null;
      return { stage, value, baselineValue, gap, indicatorName, indicatorId, indicatorCode };
    });
  }, [pathway.stages, indicatorMap, baselineMap]);

  // Find worst performing stage
  const worstStage = useMemo(() => {
    let worst: StageData | null = null;
    let worstGap = 0;

    for (const sd of stageData) {
      if (sd.gap === null) continue;
      const effectiveGap = sd.stage.higherIsBetter ? sd.gap : -sd.gap;
      if (effectiveGap < worstGap) {
        worstGap = effectiveGap;
        worst = sd;
      }
    }
    return worst;
  }, [stageData]);

  const hasData = stageData.some(sd => sd.value !== null);
  if (!hasData) return null;

  const stageCount = stageData.length;

  // Build grid template: stage columns separated by narrow arrow columns
  // e.g. for 4 stages: "1fr 20px 1fr 20px 1fr 20px 1fr"
  const gridCols = stageData
    .map(() => 'minmax(0, 1fr)')
    .join(' 20px ');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: pathway.color }}
              />
              {pathway.name}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {pathway.description}
            </CardDescription>
          </div>
          {worstStage && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 flex-shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Focus on {worstStage.stage.type}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Grid: equal-width stage cards with arrows between */}
        <div
          className="grid items-stretch"
          style={{ gridTemplateColumns: gridCols }}
        >
          {stageData.flatMap((sd, idx) => {
            const isWorst = sd === worstStage;
            const gapDirection = getGapDirection(sd.gap, sd.stage.higherIsBetter);

            const cardContent = (
              <>
                {/* Row 1: Type label + indicator code */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    {sd.stage.type}
                  </span>
                  {sd.indicatorCode && (
                    <span className="text-[10px] text-gray-300 font-mono">
                      {sd.indicatorCode}
                    </span>
                  )}
                </div>

                {/* Row 2: Stage name */}
                <div className="font-medium text-sm text-gray-900">
                  {sd.stage.name}
                </div>

                {/* Row 3: Value (always reserves space) */}
                <div className={cn(
                  'text-xl font-bold tabular-nums mt-1',
                  sd.value === null ? 'text-gray-300' :
                  gapDirection === 'below' ? 'text-red-600' :
                  gapDirection === 'above' ? 'text-green-700' : 'text-gray-900'
                )}>
                  {sd.value !== null ? formatFn(sd.value) : '—'}
                </div>

                {/* Row 4: Gap vs baseline (always reserves space) */}
                <div className={cn(
                  'text-xs tabular-nums h-4',
                  gapDirection === 'above' ? 'text-green-600' :
                  gapDirection === 'below' ? 'text-red-600' : 'text-gray-400'
                )}>
                  {sd.gap !== null
                    ? `${Math.abs(sd.gap).toFixed(1)}pp ${gapDirection === 'above' ? 'above' : gapDirection === 'below' ? 'below' : 'at'} avg`
                    : '\u00A0'}
                </div>

                {/* Row 5: Description (pushed to bottom) */}
                <div className="text-[11px] text-gray-500 mt-auto pt-2 line-clamp-2 leading-tight">
                  {sd.stage.description}
                </div>
              </>
            );

            const cardClasses = cn(
              'flex flex-col p-3 rounded-lg border h-full transition-shadow',
              isWorst ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200',
              sd.indicatorId && 'hover:shadow-md cursor-pointer',
            );

            const elements = [
              sd.indicatorId ? (
                <Link
                  key={sd.stage.id}
                  href={buildUrl(`/dashboard/${sd.indicatorId}`, searchParams)}
                  className={cardClasses}
                >
                  {cardContent}
                </Link>
              ) : (
                <div key={sd.stage.id} className={cardClasses}>
                  {cardContent}
                </div>
              ),
            ];

            // Arrow between stages
            if (idx < stageCount - 1) {
              elements.push(
                <div key={`arrow-${idx}`} className="flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              );
            }

            return elements;
          })}
        </div>

        {/* Insight for worst stage */}
        {worstStage && worstStage.gap !== null && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <span className="font-medium">{worstStage.indicatorName}</span> is{' '}
              {Math.abs(worstStage.gap).toFixed(1)}pp{' '}
              {worstStage.stage.higherIsBetter
                ? (worstStage.gap < 0 ? 'below' : 'above')
                : (worstStage.gap > 0 ? 'above' : 'below')
              }{' '}
              average.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PathwayOverview({
  indicators,
  baselineIndicators = [],
  baselineName = 'England',
  areaName,
}: PathwayOverviewProps) {
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

  return (
    <div className="space-y-4">
      {CONDITION_PATHWAYS.map(pathway => (
        <PathwayCard
          key={pathway.id}
          pathway={pathway}
          indicatorMap={indicatorMap}
          baselineMap={baselineMap}
          baselineName={baselineName}
        />
      ))}
    </div>
  );
}
