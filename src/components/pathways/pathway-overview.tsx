'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONDITION_PATHWAYS, type ConditionPathway, type PathwayStage } from '@/lib/constants/pathways';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { ChevronRight, AlertTriangle, CheckCircle2, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PathwayOverviewProps {
  indicators: IndicatorWithData[];
  baselineIndicators?: IndicatorWithData[];
  baselineName?: string;
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
  const populatedStages = stageData.filter(sd => sd.value !== null).length;

  // Build grid template: stage columns separated by narrow arrow columns
  // e.g. for 4 stages: "1fr 20px 1fr 20px 1fr 20px 1fr"
  const gridCols = stageData
    .map(() => 'minmax(0, 1fr)')
    .join(' 20px ');

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-nhs-pale-grey/30 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <Route className="h-3.5 w-3.5" />
              Pathway view
            </div>
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: pathway.color }}
              />
              {pathway.name}
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl text-sm">
              {pathway.description}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-gray-200 bg-white text-gray-600">
              {populatedStages} of {stageCount} stages populated
            </Badge>
            {worstStage && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 flex-shrink-0">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Focus on {worstStage.stage.type}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Stages with data</div>
            <div className="mt-2 text-2xl font-semibold text-nhs-dark-blue">{populatedStages}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Key bottleneck</div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {worstStage ? worstStage.stage.name : 'No gap identified'}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Comparison point</div>
            <div className="mt-2 text-sm font-semibold text-gray-900">{baselineName}</div>
          </div>
        </div>

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
              'flex h-full flex-col rounded-2xl border p-4 transition-all',
              isWorst ? 'border-amber-300 bg-amber-50/60 shadow-sm' : 'border-gray-200 bg-white',
              sd.indicatorId && 'cursor-pointer hover:border-nhs-blue/35 hover:shadow-md',
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              <span className="font-medium">{worstStage.indicatorName}</span> is{' '}
              {Math.abs(worstStage.gap).toFixed(1)}pp{' '}
              {worstStage.stage.higherIsBetter
                ? (worstStage.gap < 0 ? 'below' : 'above')
                : (worstStage.gap > 0 ? 'above' : 'below')
              }{' '}
              {baselineName}. This is the biggest opportunity in the pathway right now.
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
      <Card className="border-nhs-blue/10 bg-gradient-to-r from-white via-white to-nhs-pale-grey/40">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="mb-1 text-sm font-medium text-nhs-blue">
              Pathways
            </div>
            <h2 className="text-lg font-semibold text-nhs-dark-blue">From prevalence to outcomes</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Each pathway follows the logical clinical journey and highlights where performance drops furthest away from {baselineName}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Pathways shown</div>
              <div className="mt-2 text-2xl font-semibold text-nhs-dark-blue">{CONDITION_PATHWAYS.length}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Focus logic</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Largest gap first
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Interpretation</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Bottlenecks made visible
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
