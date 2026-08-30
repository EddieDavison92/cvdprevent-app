'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { getConditionPathways, type ConditionPathway, type PathwayStage } from '@/lib/constants/pathways';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue, formatAbsDiff } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';

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
  formatDisplayName: string;
}

interface StageGroup {
  stage: PathwayStage;
  indicators: StageData[];
}

function getPersonsValue(indicator: IndicatorWithData): number | null {
  const persons = indicator.Categories.find(
    (category) => category.MetricCategoryTypeName === 'Sex' && category.MetricCategoryName === 'Persons'
  );
  return persons?.Data.Value ?? null;
}

function getGapDirection(gap: number | null, higherIsBetter: boolean) {
  if (gap === null) return null;
  if (higherIsBetter) return gap > COMPARISON_TOLERANCE ? 'ahead' : gap < -COMPARISON_TOLERANCE ? 'behind' : 'in line';
  return gap < -COMPARISON_TOLERANCE ? 'ahead' : gap > COMPARISON_TOLERANCE ? 'behind' : 'in line';
}

function getGapLabel(item: StageData, baselineName: string) {
  if (item.gap === null) return 'No comparison';
  const direction = getGapDirection(item.gap, item.stage.higherIsBetter);
  if (direction === 'in line') return `In line with ${baselineName}`;
  if (item.stage.type === 'prevalence') {
    return `${formatAbsDiff(item.gap, item.formatDisplayName)} ${item.gap < 0 ? 'lower than' : 'higher than'} ${baselineName}`;
  }
  return `${formatAbsDiff(item.gap, item.formatDisplayName)} ${direction === 'ahead' ? 'ahead of' : 'behind'} ${baselineName}`;
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
  const searchParams = useSearchParams();

  const stageGroups = useMemo<StageGroup[]>(() => pathway.stages.map((stage) => {
    const stageIndicators = stage.indicatorCodes.flatMap((code) => {
      const indicator = indicatorMap.get(code);
      if (!indicator) return [];
      const value = getPersonsValue(indicator);
      if (value === null) return [];

      const baselineIndicator = baselineMap.get(code);
      const baselineValue = baselineIndicator ? getPersonsValue(baselineIndicator) : null;
      return [{
        stage,
        value,
        baselineValue,
        gap: baselineValue === null ? null : value - baselineValue,
        indicatorName: indicator.IndicatorShortName.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim(),
        indicatorId: indicator.IndicatorID,
        indicatorCode: code,
        formatDisplayName: indicator.FormatDisplayName,
      }];
    });

    return { stage, indicators: stageIndicators };
  }), [pathway.stages, indicatorMap, baselineMap]);

  const worstStage = useMemo(() => {
    let worst: StageData | null = null;
    let worstScore = 0;
    for (const group of stageGroups) {
      for (const item of group.indicators) {
        if (item.gap === null) continue;
        const score = item.stage.higherIsBetter ? item.gap : -item.gap;
        if (score < worstScore) {
          worst = item;
          worstScore = score;
        }
      }
    }
    return worst;
  }, [stageGroups]);

  const populatedStages = stageGroups.filter((group) => group.indicators.length > 0).length;
  if (populatedStages === 0) return null;

  return (
    <section aria-labelledby={`pathway-${pathway.id}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <h3 id={`pathway-${pathway.id}`} className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pathway.color }} aria-hidden />
            {pathway.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">{pathway.description}</p>
        </div>
        {worstStage && (
          <div className="max-w-sm text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Priority stage: {worstStage.stage.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {worstStage.indicatorName} is {getGapLabel(worstStage, baselineName)}
            </p>
          </div>
        )}
      </header>

      <div>
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-none xl:grid-flow-col xl:auto-cols-fr">
          {stageGroups.map((group, index) => {
            const hasWorstIndicator = group.indicators.some((item) => item === worstStage);

            return (
              <div
                key={group.stage.id}
                className={cn(
                  'border-t-2',
                  index % 2 === 1 && 'sm:border-l sm:border-l-gray-100',
                  index > 0 && 'xl:border-l xl:border-l-gray-100',
                  hasWorstIndicator ? 'border-t-amber-400' : 'border-t-transparent',
                )}
              >
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{group.stage.type}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{group.stage.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{group.stage.description}</p>
                </div>

                {group.indicators.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-gray-400">No data</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {group.indicators.map((item) => {
                      const direction = getGapDirection(item.gap, item.stage.higherIsBetter);
                      return (
                        <Link
                          key={item.indicatorCode}
                          href={buildUrl(`/dashboard/${item.indicatorId}`, searchParams)}
                          className={cn(
                            'group block px-4 py-3 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none',
                            item === worstStage && 'bg-amber-50/50',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium leading-4 text-gray-800 group-hover:text-nhs-blue">{item.indicatorName}</p>
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-nhs-blue" />
                          </div>
                          <p className="mt-1 font-mono text-[10px] text-gray-400">{item.indicatorCode}</p>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-base font-semibold tabular-nums text-gray-900">{formatValue(item.value!, item.formatDisplayName)}</span>
                            {item.baselineValue !== null && (
                              <span className="text-xs tabular-nums text-gray-400">vs {formatValue(item.baselineValue, item.formatDisplayName)}</span>
                            )}
                          </div>
                          <p className={cn(
                            'mt-1 text-xs font-medium tabular-nums',
                            direction === 'ahead' ? 'text-nhs-green' : direction === 'behind' ? 'text-nhs-red' : 'text-gray-500',
                          )}>
                            {getGapLabel(item, baselineName)}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}

export function PathwayOverview({
  indicators,
  baselineIndicators = [],
  baselineName = 'England',
}: PathwayOverviewProps) {
  const indicatorMap = useMemo(
    () => new Map(indicators.map((indicator) => [indicator.IndicatorCode, indicator])),
    [indicators]
  );
  const baselineMap = useMemo(
    () => new Map(baselineIndicators.map((indicator) => [indicator.IndicatorCode, indicator])),
    [baselineIndicators]
  );
  const pathways = useMemo(() => getConditionPathways(indicators), [indicators]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Clinical pathways</h2>
          <p className="mt-0.5 text-sm text-gray-500">Follow each condition from detection to outcomes and find its largest gap.</p>
        </div>
        <p className="text-xs text-gray-500">Compared with {baselineName}</p>
      </div>

      {pathways.map((pathway) => (
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
