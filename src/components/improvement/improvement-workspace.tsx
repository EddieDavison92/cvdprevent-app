'use client';

import { useMemo, useState } from 'react';
import { BarChart3, MapPin, Scale, Search, Users, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { IndicatorWithData } from '@/lib/api/types';
import { useComparisonAreas } from '@/lib/hooks/use-comparison-areas';
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
  areaId: number | undefined;
  areaCode: string | undefined;
  systemLevelId: number | undefined;
  areaName: string;
  systemLevelName?: string;
  timePeriodId: number | undefined;
  isEngland?: boolean;
  isLoading?: boolean;
}

const LENSES: Array<{ id: Lens; label: string; icon: LucideIcon; needsPeers: boolean }> = [
  { id: 'opportunity', label: 'Opportunity', icon: Users, needsPeers: true },
  { id: 'position', label: 'Position & direction', icon: BarChart3, needsPeers: false },
  { id: 'inequalities', label: 'Inequalities', icon: Scale, needsPeers: false },
  { id: 'within', label: 'Within our area', icon: MapPin, needsPeers: false },
];

/** Level the fourth lens breaks an area down into. ICBs go straight to PCNs. */
const CHILD_LEVEL: Record<string, { label: string; depth: 'children' | 'grandchildren' }> = {
  England: { label: 'region', depth: 'children' },
  Region: { label: 'ICB', depth: 'children' },
  ICB: { label: 'PCN', depth: 'grandchildren' },
  'Sub-ICB': { label: 'PCN', depth: 'children' },
  PCN: { label: 'practice', depth: 'children' },
};

export function ImprovementWorkspace({
  indicators,
  areaId,
  areaCode,
  systemLevelId,
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
  const childLevel = CHILD_LEVEL[systemLevelName ?? ''] ?? { label: 'area', depth: 'children' as const };
  const lensLabel = (id: Lens, label: string) => (id === 'within' ? `By ${childLevel.label}` : label);

  const comparisons = useComparisonAreas(
    areaId && areaCode && systemLevelId ? { AreaID: areaId, AreaCode: areaCode, SystemLevelID: systemLevelId } : null,
    timePeriodId,
  );
  const targetIsKnown = targetParam === 'median' || targetParam === 'top'
    || comparisons.some((comparison) => `area:${comparison.id}` === targetParam);
  const target = (targetIsKnown ? targetParam : 'median') as OpportunityTarget;

  const rows = useMemo(
    () => buildLensRows(indicators ?? [], { includePeers: hasPeers }),
    [indicators, hasPeers],
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
      <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">View</span>
            <div role="tablist" aria-label="View" className="inline-flex flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5">
              {lenses.map((candidate) => {
                const Icon = candidate.icon;
                const active = candidate.id === lens;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setLens(candidate.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue',
                      active ? 'bg-white text-nhs-blue shadow-sm' : 'text-gray-600 hover:bg-white/60 hover:text-gray-900',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {lensLabel(candidate.id, candidate.label)}
                  </button>
                );
              })}
            </div>
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
            comparisons={comparisons}
          />
        )}
        {lens === 'position' && (
          <PositionLens rows={visibleRows} areaName={displayAreaName} systemLevelName={peersLabel} hasPeers={hasPeers} />
        )}
        {lens === 'inequalities' && (
          <InequalitiesLens rows={visibleRows} dimension={dimensionParam as PopulationDimension} onDimensionChange={setDimension} />
        )}
        <div hidden={lens !== 'within'}>
          <WithinAreaLens rows={visibleRows} areaId={areaId} areaName={displayAreaName} timePeriodId={timePeriodId} active={lens === 'within'} defaultDepth={childLevel.depth} peersLabel={peersLabel} />
        </div>
      </section>
    </div>
  );
}
