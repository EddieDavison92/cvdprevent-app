'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CONDITION_PATHWAYS, type ConditionPathway, type PathwayStage } from '@/lib/constants/pathways';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatValue, formatAbsDiff } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';

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

function getPersonsValue(indicator: IndicatorWithData): number | null {
  const persons = indicator.Categories.find(
    (category) => category.MetricCategoryTypeName === 'Sex' && category.MetricCategoryName === 'Persons'
  );
  return persons?.Data.Value ?? null;
}

function getGapDirection(gap: number | null, higherIsBetter: boolean) {
  if (gap === null) return null;
  if (higherIsBetter) return gap > 0.5 ? 'ahead' : gap < -0.5 ? 'behind' : 'in line';
  return gap < -0.5 ? 'ahead' : gap > 0.5 ? 'behind' : 'in line';
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

  const stageData = useMemo<StageData[]>(() => pathway.stages.map((stage) => {
    for (const code of stage.indicatorCodes) {
      const indicator = indicatorMap.get(code);
      if (!indicator) continue;
      const value = getPersonsValue(indicator);
      if (value === null) continue;

      const baselineIndicator = baselineMap.get(code);
      const baselineValue = baselineIndicator ? getPersonsValue(baselineIndicator) : null;
      return {
        stage,
        value,
        baselineValue,
        gap: baselineValue === null ? null : value - baselineValue,
        indicatorName: indicator.IndicatorShortName.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim(),
        indicatorId: indicator.IndicatorID,
        indicatorCode: code,
        formatDisplayName: indicator.FormatDisplayName,
      };
    }

    return {
      stage,
      value: null,
      baselineValue: null,
      gap: null,
      indicatorName: stage.name,
      indicatorId: null,
      indicatorCode: null,
      formatDisplayName: '%',
    };
  }), [pathway.stages, indicatorMap, baselineMap]);

  const worstStage = useMemo(() => {
    let worst: StageData | null = null;
    let worstScore = 0;
    for (const item of stageData) {
      if (item.gap === null) continue;
      const score = item.stage.higherIsBetter ? item.gap : -item.gap;
      if (score < worstScore) {
        worst = item;
        worstScore = score;
      }
    }
    return worst;
  }, [stageData]);

  const populatedStages = stageData.filter((item) => item.value !== null).length;
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

      <div className="overflow-x-auto">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `repeat(${stageData.length}, minmax(170px, 1fr))` }}
        >
          {stageData.map((item, index) => {
            const direction = getGapDirection(item.gap, item.stage.higherIsBetter);
            const isWorst = item === worstStage;
            const content = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{item.stage.type}</span>
                  <span className="font-mono text-[10px] text-gray-400">{item.indicatorCode ?? 'No data'}</span>
                </div>
                <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-gray-800">{item.stage.name}</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums text-gray-900">
                    {item.value === null ? '—' : formatValue(item.value, item.formatDisplayName)}
                  </span>
                  {item.baselineValue !== null && (
                    <span className="text-xs tabular-nums text-gray-400">vs {formatValue(item.baselineValue, item.formatDisplayName)}</span>
                  )}
                </div>
                <p className={cn(
                  'mt-1 text-xs font-medium tabular-nums',
                  direction === 'ahead' ? 'text-nhs-green' : direction === 'behind' ? 'text-nhs-red' : 'text-gray-500'
                )}>
                  {getGapLabel(item, baselineName)}
                </p>
                {item.indicatorId && (
                  <span className="mt-auto flex items-center gap-1 pt-3 text-xs text-gray-400 group-hover:text-nhs-blue">
                    View indicator <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </>
            );

            const className = cn(
              'group flex min-h-40 flex-col border-t-2 px-4 py-3 transition-colors',
              index > 0 && 'border-l border-l-gray-100',
              isWorst ? 'border-t-amber-400 bg-amber-50/50' : 'border-t-transparent',
              item.indicatorId && 'hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none'
            );

            return item.indicatorId ? (
              <Link key={item.stage.id} href={buildUrl(`/dashboard/${item.indicatorId}`, searchParams)} className={className}>
                {content}
              </Link>
            ) : (
              <div key={item.stage.id} className={className}>{content}</div>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Clinical pathways</h2>
          <p className="mt-0.5 text-sm text-gray-500">Follow each condition from detection to outcomes and find its largest gap.</p>
        </div>
        <p className="text-xs text-gray-500">Compared with {baselineName}</p>
      </div>

      {CONDITION_PATHWAYS.map((pathway) => (
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
