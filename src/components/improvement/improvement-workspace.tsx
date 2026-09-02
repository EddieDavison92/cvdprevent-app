'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { IndicatorWithData } from '@/lib/api/types';
import { getPersonsData } from '@/lib/hooks/use-area-indicators';
import { getDashboardSections } from '@/lib/constants/indicator-sections';
import { buildLensRows, type Lens, type OpportunityTarget } from '@/lib/utils/improvement-lenses';
import type { PopulationDimension } from '@/lib/utils/quality-improvement';
import { cn } from '@/lib/utils';
import { cleanAreaName, useUrlParam } from './lens-shared';
import { OpportunityLens } from './opportunity-lens';
import { PositionLens } from './position-lens';
import { InequalitiesLens } from './inequalities-lens';
import { WithinAreaLens } from './within-area-lens';

interface ImprovementWorkspaceProps {
  indicators: IndicatorWithData[] | undefined;
  baselineIndicators?: IndicatorWithData[];
  baselineName?: string;
  areaId: number | undefined;
  areaName: string;
  systemLevelName?: string;
  timePeriodId: number | undefined;
  isEngland?: boolean;
  isLoading?: boolean;
}

const LENSES: Array<{ id: Lens; label: string; question: string; needsPeers: boolean }> = [
  { id: 'opportunity', label: 'Opportunity', question: 'How many patients would benefit?', needsPeers: true },
  { id: 'position', label: 'Position & direction', question: 'Where do we stand, and which way are we moving?', needsPeers: false },
  { id: 'inequalities', label: 'Inequalities', question: 'Who is being left behind?', needsPeers: false },
  { id: 'within', label: 'Within our area', question: 'Where in our patch?', needsPeers: false },
];

export function ImprovementWorkspace({
  indicators,
  baselineIndicators,
  baselineName,
  areaId,
  areaName,
  systemLevelName,
  timePeriodId,
  isEngland = false,
  isLoading,
}: ImprovementWorkspaceProps) {
  const hasPeers = !isEngland;
  const lenses = LENSES.filter((lens) => hasPeers || !lens.needsPeers);
  const [lensParam, setLens] = useUrlParam('lens', lenses[0].id);
  const lens = (lenses.some((candidate) => candidate.id === lensParam) ? lensParam : lenses[0].id) as Lens;
  const [stage, setStage] = useUrlParam('stage', 'all');
  const [targetParam, setTarget] = useUrlParam('target', 'median');
  const [dimensionParam, setDimension] = useUrlParam('dim', 'Deprivation quintile');
  const [query, setQuery] = useState('');

  const displayAreaName = cleanAreaName(areaName);
  const peersLabel = systemLevelName ? `${systemLevelName}s` : 'peers';

  const baselineValues = useMemo(() => {
    const map = new Map<string, number>();
    for (const indicator of baselineIndicators ?? []) {
      const value = getPersonsData(indicator)?.Data.Value;
      if (value !== null && value !== undefined) map.set(indicator.IndicatorCode, value);
    }
    return map;
  }, [baselineIndicators]);
  const baselineAvailable = baselineValues.size > 0 && !!baselineName;
  const target = (targetParam === 'baseline' && !baselineAvailable ? 'median' : targetParam) as OpportunityTarget;

  const rows = useMemo(
    () => buildLensRows(indicators ?? [], { includePeers: hasPeers, baselineValues }),
    [indicators, hasPeers, baselineValues],
  );
  const stages = useMemo(() => getDashboardSections(indicators ?? []).filter((section) => section.indicatorCodes.length > 0), [indicators]);

  const visibleRows = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    return rows.filter((row) => (
      (stage === 'all' || row.section.id === stage)
      && (!normalised || [row.indicator.IndicatorCode, row.indicator.IndicatorName, row.indicator.IndicatorShortName].some((text) => text.toLowerCase().includes(normalised)))
    ));
  }, [rows, stage, query]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-[32rem] rounded-lg" />
      </div>
    );
  }
  if (!indicators?.length) {
    return <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-gray-500">No indicators available</div>;
  }

  const activeLens = lenses.find((candidate) => candidate.id === lens)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{activeLens.question}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {hasPeers
              ? `Four questions about ${displayAreaName}.`
              : 'Three questions about England. Peer comparison needs an area below England.'}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Lens" className="flex flex-wrap gap-1">
            {lenses.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={candidate.id === lens}
                onClick={() => setLens(candidate.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue',
                  candidate.id === lens ? 'bg-nhs-blue text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Search indicators</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search indicator or code" className="h-8 w-full bg-white pl-8 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2" role="group" aria-label="Pathway stage">
          <span className="mr-1 text-xs font-medium text-gray-500">Stage</span>
          {[{ id: 'all', name: 'All', color: '' }, ...stages].map((section) => (
            <button
              key={section.id}
              type="button"
              aria-pressed={stage === section.id}
              onClick={() => setStage(stage === section.id && section.id !== 'all' ? 'all' : section.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue',
                stage === section.id ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {section.color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />}
              {section.name}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white" aria-label={activeLens.label}>
        {lens === 'opportunity' && (
          <OpportunityLens
            rows={visibleRows}
            areaName={displayAreaName}
            systemLevelName={peersLabel}
            target={target}
            onTargetChange={setTarget}
            baselineName={baselineAvailable ? baselineName! : null}
          />
        )}
        {lens === 'position' && (
          <PositionLens rows={visibleRows} areaName={displayAreaName} systemLevelName={peersLabel} hasPeers={hasPeers} />
        )}
        {lens === 'inequalities' && (
          <InequalitiesLens rows={visibleRows} dimension={dimensionParam as PopulationDimension} onDimensionChange={setDimension} />
        )}
        <div hidden={lens !== 'within'}>
          <WithinAreaLens rows={visibleRows} areaId={areaId} areaName={displayAreaName} timePeriodId={timePeriodId} active={lens === 'within'} />
        </div>
      </section>
    </div>
  );
}
