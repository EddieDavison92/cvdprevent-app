'use client';

import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAreas } from '@/lib/hooks/use-areas';
import { useIndicators } from '@/lib/hooks/use-indicator-data';
import { getIndicatorData, getPersonsData } from '@/lib/api';
import { SYSTEM_LEVELS, type IndicatorRawData, type Area, type Indicator } from '@/lib/api/types';
import { DASHBOARD_SECTIONS, findSectionForIndicator, type DashboardSection } from '@/lib/constants/indicator-sections';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { formatValue } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/lib/utils/csv';
import {
  ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Info, Download,
  Activity, SearchX, Pill, Target, ClipboardCheck, HeartPulse,
} from 'lucide-react';
import type { SectionType } from '@/lib/constants/indicator-sections';

// Key indicators — one per section for the default view
const DEFAULT_INDICATOR_CODES = [
  'CVDP001HYP',  // Hypertension prevalence
  'CVDP005HYP',  // Undiagnosed hypertension
  'CVDP002AF',   // AF anticoagulation
  'CVDP007HYP',  // Hypertension treated to target
  'CVDP011CHOL', // CVD cholesterol monitoring
  'CVDP002MORT', // CVD mortality
];

// Icons for each section (used in column key and filter pills)
const SECTION_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  prevalence: Activity,
  detection: SearchX,
  treatment: Pill,
  control: Target,
  monitoring: ClipboardCheck,
  outcomes: HeartPulse,
};

const LEVEL_OPTIONS = [
  { id: SYSTEM_LEVELS.REGION, label: 'Regions' },
  { id: SYSTEM_LEVELS.ICB, label: 'ICBs' },
  { id: SYSTEM_LEVELS.SUB_ICB, label: 'Sub-ICBs' },
  { id: SYSTEM_LEVELS.PCN, label: 'PCNs' },
];

type SortConfig = { column: string; direction: 'asc' | 'desc' };

function cleanAreaName(name: string) {
  return name
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '')
    .replace(/ - [A-Z0-9]+$/, '');
}

function cleanIndicatorName(name: string) {
  return name.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim();
}

// Cell colour based on comparison to England, accounting for polarity
function getCellStyle(value: number | null, englandValue: number | null, lowerIsBetter: boolean) {
  if (value === null || englandValue === null || englandValue === 0) {
    return { bg: '', text: 'text-gray-400' };
  }
  const diff = value - englandValue;
  const relativeDiff = (Math.abs(diff) / englandValue) * 100;

  if (relativeDiff <= 0.25) {
    return { bg: 'bg-amber-50', text: 'text-gray-900' };
  }

  const isBetter = lowerIsBetter ? diff < 0 : diff > 0;
  if (isBetter) {
    return { bg: 'bg-green-50', text: 'text-green-800' };
  }
  return { bg: 'bg-red-50', text: 'text-red-800' };
}

export default function BenchmarksPage() {
  const [levelId, setLevelId] = useState<number>(SYSTEM_LEVELS.ICB);
  const [parentAreaId, setParentAreaId] = useState<number | undefined>();
  const [compareToParent, setCompareToParent] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortConfig>({ column: 'score', direction: 'desc' });

  // Determine time period (standard for most, outcome for mortality)
  const { data: standardPeriod } = useLatestTimePeriod('standard');
  const { data: outcomePeriod } = useLatestTimePeriod('outcome');

  // Fetch indicator list to resolve codes → IDs
  const { data: indicatorList } = useIndicators(
    standardPeriod?.TimePeriodID,
    SYSTEM_LEVELS.ENGLAND
  );
  const { data: outcomeIndicatorList } = useIndicators(
    outcomePeriod?.TimePeriodID,
    SYSTEM_LEVELS.ENGLAND
  );

  // Fetch parent-level areas for scoping
  const { data: regions } = useAreas(standardPeriod?.TimePeriodID, SYSTEM_LEVELS.REGION);
  const { data: icbs } = useAreas(standardPeriod?.TimePeriodID, SYSTEM_LEVELS.ICB);
  const { data: subIcbs } = useAreas(standardPeriod?.TimePeriodID, SYSTEM_LEVELS.SUB_ICB);

  // Determine which parent areas to show in the scope dropdown
  const parentOptions = useMemo(() => {
    if (levelId === SYSTEM_LEVELS.ICB) return regions ?? [];
    if (levelId === SYSTEM_LEVELS.SUB_ICB) return icbs ?? [];
    if (levelId === SYSTEM_LEVELS.PCN) return icbs ?? [];
    return [];
  }, [levelId, regions, icbs]);

  const parentLabel = levelId === SYSTEM_LEVELS.ICB ? 'Region' : 'ICB';

  // Resolve the selected parent's system level and area code
  const parentSystemLevel = levelId === SYSTEM_LEVELS.ICB ? SYSTEM_LEVELS.REGION
    : levelId === SYSTEM_LEVELS.SUB_ICB ? SYSTEM_LEVELS.ICB
    : levelId === SYSTEM_LEVELS.PCN ? SYSTEM_LEVELS.ICB
    : undefined;

  const selectedParent = parentOptions.find(a => a.AreaID === parentAreaId);
  const useParentBaseline = !!parentAreaId && compareToParent;
  const baselineName = useParentBaseline && selectedParent
    ? cleanAreaName(selectedParent.AreaName)
    : 'England';

  // Fetch areas at selected level
  const { data: areas } = useAreas(standardPeriod?.TimePeriodID, levelId);

  // Filter areas by parent scope
  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (!parentAreaId) {
      // PCN requires scoping, others show all
      return levelId === SYSTEM_LEVELS.PCN ? [] : areas;
    }

    if (levelId === SYSTEM_LEVELS.PCN) {
      // PCN.Parents → Sub-ICB IDs, need to find Sub-ICBs under the selected ICB
      const subIcbIds = new Set(
        (subIcbs ?? []).filter(s => s.Parents?.includes(parentAreaId)).map(s => s.AreaID)
      );
      return areas.filter(a => a.Parents?.some(p => subIcbIds.has(p)));
    }

    // ICB/Sub-ICB: Parents directly contain the parent AreaID
    return areas.filter(a => a.Parents?.includes(parentAreaId));
  }, [areas, levelId, parentAreaId, subIcbs]);

  // Resolve indicator codes to objects with IDs + time periods
  const selectedIndicators = useMemo(() => {
    if (!indicatorList) return [];

    const allIndicators = [...indicatorList, ...(outcomeIndicatorList ?? [])];
    const codes = sectionFilter
      ? DASHBOARD_SECTIONS.find(s => s.id === sectionFilter)?.indicatorCodes ?? []
      : DEFAULT_INDICATOR_CODES;

    return codes
      .map(code => {
        const ind = allIndicators.find(i => i.IndicatorCode === code);
        if (!ind) return null;
        const isOutcome = code.includes('MORT') || code.includes('ADMN');
        const timePeriodId = isOutcome ? outcomePeriod?.TimePeriodID : standardPeriod?.TimePeriodID;
        const section = findSectionForIndicator(code);
        return { ...ind, timePeriodId, section };
      })
      .filter((x): x is Indicator & { timePeriodId: number | undefined; section: DashboardSection | undefined } => x !== null && x.timePeriodId !== undefined);
  }, [indicatorList, outcomeIndicatorList, standardPeriod, outcomePeriod, sectionFilter]);

  // Fetch rawDataJSON for each selected indicator + England baseline
  const dataQueries = useQueries({
    queries: selectedIndicators.map(ind => ({
      queryKey: ['indicatorData', ind.IndicatorID, ind.timePeriodId, levelId],
      queryFn: () => getIndicatorData(ind.IndicatorID, ind.timePeriodId!, levelId),
      enabled: !!ind.timePeriodId,
      staleTime: 10 * 60 * 1000,
    })),
  });

  const englandQueries = useQueries({
    queries: selectedIndicators.map(ind => ({
      queryKey: ['indicatorData', ind.IndicatorID, ind.timePeriodId, SYSTEM_LEVELS.ENGLAND],
      queryFn: () => getIndicatorData(ind.IndicatorID, ind.timePeriodId!, SYSTEM_LEVELS.ENGLAND),
      enabled: !!ind.timePeriodId,
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Fetch parent-level data when scoping (e.g. Region data when viewing ICBs in London)
  const parentLevelQueries = useQueries({
    queries: selectedIndicators.map(ind => ({
      queryKey: ['indicatorData', ind.IndicatorID, ind.timePeriodId, parentSystemLevel],
      queryFn: () => getIndicatorData(ind.IndicatorID, ind.timePeriodId!, parentSystemLevel!),
      enabled: !!ind.timePeriodId && !!parentSystemLevel && !!parentAreaId,
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Build the data matrix and baseline values
  const { matrix, englandValues, parentValues } = useMemo(() => {
    const englandValues = new Map<number, number | null>();
    const parentValues = new Map<number, number | null>();

    // Get England values
    englandQueries.forEach((q, i) => {
      if (!q.data) return;
      const persons = getPersonsData(q.data);
      const value = persons[0]?.Value ?? null;
      englandValues.set(selectedIndicators[i].IndicatorID, value);
    });

    // Get parent area values
    if (selectedParent) {
      parentLevelQueries.forEach((q, i) => {
        if (!q.data) return;
        const persons = getPersonsData(q.data);
        const parentRow = persons.find(r => r.AreaCode === selectedParent.AreaCode);
        parentValues.set(selectedIndicators[i].IndicatorID, parentRow?.Value ?? null);
      });
    }

    // Build area → indicator → value map
    const areaMap = new Map<string, Map<number, number | null>>();

    dataQueries.forEach((q, i) => {
      if (!q.data) return;
      const persons = getPersonsData(q.data);
      const indicatorId = selectedIndicators[i].IndicatorID;

      for (const row of persons) {
        if (!areaMap.has(row.AreaCode)) {
          areaMap.set(row.AreaCode, new Map());
        }
        areaMap.get(row.AreaCode)!.set(indicatorId, row.Value);
      }
    });

    return { matrix: areaMap, englandValues, parentValues };
  }, [dataQueries, englandQueries, parentLevelQueries, selectedIndicators, selectedParent]);

  // Filter out indicators that returned no area-level data (unavailable at this level)
  // Pick baseline: parent values if scoped + toggled, otherwise England
  const baselineValues = useParentBaseline ? parentValues : englandValues;

  const { availableIndicators, unavailableCount } = useMemo(() => {
    const available = selectedIndicators.filter((ind, i) => {
      const q = dataQueries[i];
      if (!q?.data) return !q?.isLoading; // keep if still loading
      const persons = getPersonsData(q.data);
      return persons.length > 0;
    });
    return {
      availableIndicators: available,
      unavailableCount: selectedIndicators.length - available.length,
    };
  }, [selectedIndicators, dataQueries]);

  // Compute composite score (average percentile rank across available indicators)
  const areaScores = useMemo(() => {
    if (filteredAreas.length === 0 || availableIndicators.length === 0) return new Map<string, number>();

    // For each indicator, rank areas by value
    const ranks = new Map<string, number[]>();
    for (const area of filteredAreas) {
      ranks.set(area.AreaCode, []);
    }

    for (const ind of availableIndicators) {
      const lowerIsBetter = ind.section?.lowerIsBetter ?? false;
      const values = filteredAreas
        .map(a => ({ code: a.AreaCode, value: matrix.get(a.AreaCode)?.get(ind.IndicatorID) ?? null }))
        .filter(v => v.value !== null) as { code: string; value: number }[];

      // Sort: for "higher is better", highest = rank 1
      values.sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);

      values.forEach((v, idx) => {
        const percentile = values.length > 1 ? ((values.length - 1 - idx) / (values.length - 1)) * 100 : 50;
        ranks.get(v.code)?.push(percentile);
      });
    }

    const scores = new Map<string, number>();
    for (const [code, percentiles] of ranks) {
      if (percentiles.length === 0) {
        scores.set(code, 0);
      } else {
        scores.set(code, percentiles.reduce((s, v) => s + v, 0) / percentiles.length);
      }
    }
    return scores;
  }, [filteredAreas, availableIndicators, matrix]);

  // Sort areas
  const sortedAreas = useMemo(() => {
    const sorted = [...filteredAreas];
    sorted.sort((a, b) => {
      let aVal: number | string | null;
      let bVal: number | string | null;

      if (sort.column === 'name') {
        aVal = a.AreaName;
        bVal = b.AreaName;
        return sort.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (sort.column === 'score') {
        aVal = areaScores.get(a.AreaCode) ?? 0;
        bVal = areaScores.get(b.AreaCode) ?? 0;
      } else {
        const indId = parseInt(sort.column, 10);
        aVal = matrix.get(a.AreaCode)?.get(indId) ?? null;
        bVal = matrix.get(b.AreaCode)?.get(indId) ?? null;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
      }

      const diff = (aVal as number) - (bVal as number);
      return sort.direction === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [filteredAreas, sort, matrix, areaScores]);

  const handleSort = (column: string) => {
    setSort(prev =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'desc' }
    );
  };

  const isLoading = dataQueries.some(q => q.isLoading) || englandQueries.some(q => q.isLoading);
  const isPcn = levelId === SYSTEM_LEVELS.PCN;

  const handleExportCSV = () => {
    if (sortedAreas.length === 0 || availableIndicators.length === 0) return;
    const rows = sortedAreas.map(area => {
      const row: Record<string, unknown> = {
        'Area': cleanAreaName(area.AreaName),
        'Area Code': area.AreaCode,
        'Score': Math.round(areaScores.get(area.AreaCode) ?? 0),
      };
      for (const ind of availableIndicators) {
        row[ind.IndicatorCode] = matrix.get(area.AreaCode)?.get(ind.IndicatorID) ?? '';
      }
      return row;
    });
    const levelName = SYSTEM_LEVEL_NAMES[levelId]?.toLowerCase().replace(/\s+/g, '-') ?? 'areas';
    downloadCSV(rows, `benchmarks-${levelName}`);
  };

  // Build indicator link preserving current level/parent context
  const indicatorHref = (indicatorId: number) => {
    const params = new URLSearchParams();
    params.set('level', levelId.toString());
    if (parentAreaId) params.set('parent', parentAreaId.toString());
    return `/indicators/${indicatorId}?${params.toString()}`;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.column !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sort.direction === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-nhs-pale-grey/30 p-6">
        <div className="mx-auto max-w-[1400px]">
          {/* Page header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nhs-blue/10">
                <BarChart3 className="h-5 w-5 text-nhs-blue" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-nhs-dark-blue">Benchmarks</h1>
                <p className="text-sm text-gray-500">
                  Compare areas across indicators. Areas are ranked against each other — the score shows how consistently an area places near the top (100) or bottom (0) of the group, accounting for polarity.
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select value={levelId.toString()} onValueChange={(v) => { setLevelId(parseInt(v, 10)); setParentAreaId(undefined); }}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map(l => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {parentOptions.length > 0 && (
              <Select
                value={parentAreaId?.toString() ?? 'all'}
                onValueChange={(v) => setParentAreaId(v === 'all' ? undefined : parseInt(v, 10))}
              >
                <SelectTrigger className="w-[260px] h-9 text-sm bg-white">
                  <SelectValue placeholder={isPcn ? `Select ${parentLabel}...` : `All ${parentLabel}s`} />
                </SelectTrigger>
                <SelectContent>
                  {!isPcn && <SelectItem value="all">All {parentLabel}s</SelectItem>}
                  {parentOptions.sort((a, b) => a.AreaName.localeCompare(b.AreaName)).map(area => (
                    <SelectItem key={area.AreaID} value={area.AreaID.toString()}>
                      {cleanAreaName(area.AreaName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="h-6 w-px bg-gray-300 mx-1" />

            {/* Section filter pills */}
            <button
              onClick={() => setSectionFilter(null)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                !sectionFilter ? 'bg-nhs-dark-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
              )}
            >
              <BarChart3 className="h-3 w-3" />
              Key indicators
            </button>
            {DASHBOARD_SECTIONS.map(s => {
              const Icon = SECTION_ICONS[s.id];
              const active = sectionFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSectionFilter(active ? null : s.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    active ? 'bg-nhs-dark-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {s.name}
                </button>
              );
            })}

          </div>

          {/* PCN scoping message */}
          {isPcn && !parentAreaId && (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-gray-400">
              Select an ICB above to view its PCNs
            </div>
          )}

          {/* Empty state when parent filter has no children */}
          {!isPcn && parentAreaId && filteredAreas.length === 0 && !isLoading && (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-gray-400">
              No areas found for this selection
            </div>
          )}

          {/* Unavailable indicators notice */}
          {unavailableCount > 0 && !isLoading && (!isPcn || parentAreaId) && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {unavailableCount} indicator{unavailableCount > 1 ? 's' : ''} not available at {SYSTEM_LEVEL_NAMES[levelId]} level and {unavailableCount > 1 ? 'have' : 'has'} been hidden.
            </div>
          )}

          {/* Column key + colour legend */}
          {(!isPcn || parentAreaId) && availableIndicators.length > 0 && (
            <div className="mb-3 rounded-lg border bg-white px-4 py-3 text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                {availableIndicators.map((ind) => {
                  const Icon = ind.section ? SECTION_ICONS[ind.section.id] : BarChart3;
                  return (
                    <Link key={ind.IndicatorID} href={indicatorHref(ind.IndicatorID)} className="flex items-center gap-1.5 min-w-0 hover:text-nhs-blue transition-colors">
                      <Icon className="h-3 w-3 shrink-0 text-gray-400" />
                      <code className="shrink-0 text-gray-400 font-mono">{ind.IndicatorCode}</code>
                      <span className="text-gray-600 truncate" title={ind.IndicatorShortName}>
                        {cleanIndicatorName(ind.IndicatorShortName)}
                        {ind.section?.lowerIsBetter ? ' ↓' : ''}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t flex flex-wrap items-center gap-4 text-gray-400">
                <span className="text-gray-500 font-medium">vs {baselineName}:</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-200" /> Better
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200" /> Similar
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" /> Worse
                </div>
                <span>↓ = lower is better</span>
                {parentAreaId && (
                  <button
                    onClick={() => setCompareToParent(!compareToParent)}
                    className="ml-auto text-[11px] text-nhs-blue hover:underline"
                  >
                    Compare to {compareToParent ? 'England' : cleanAreaName(selectedParent?.AreaName ?? '')} instead
                  </button>
                )}
              </div>
            </div>
          )}

          {/* No data state */}
          {(!isPcn || parentAreaId) && !isLoading && availableIndicators.length === 0 && (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-gray-400">
              No indicators available at {SYSTEM_LEVEL_NAMES[levelId]} level for this section
            </div>
          )}

          {/* Heatmap Table */}
          {(!isPcn || parentAreaId) && (availableIndicators.length > 0 || isLoading) && (
            <div className="rounded-lg border bg-white overflow-x-auto">
              <TooltipProvider delayDuration={200}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead
                        className="sticky left-0 z-20 bg-white cursor-pointer hover:bg-gray-50 w-[180px] max-w-[220px]"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          {SYSTEM_LEVEL_NAMES[levelId]} <SortIcon column="name" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 text-center w-[60px]"
                        onClick={() => handleSort('score')}
                      >
                        <div className="flex items-center justify-center gap-1 text-[11px]">
                          Score <SortIcon column="score" />
                        </div>
                      </TableHead>
                      {availableIndicators.map((ind) => (
                        <TableHead
                          key={ind.IndicatorID}
                          className="cursor-pointer hover:bg-gray-50 text-center px-1"
                          onClick={() => handleSort(ind.IndicatorID.toString())}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-0.5">
                                <code className="text-[9px] font-semibold text-gray-500">
                                  {ind.IndicatorCode}
                                </code>
                                <SortIcon column={ind.IndicatorID.toString()} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">{cleanIndicatorName(ind.IndicatorShortName)}</p>
                              <p className="text-xs text-gray-400">{ind.section?.lowerIsBetter ? 'Lower is better' : 'Higher is better'}</p>
                              <Link href={indicatorHref(ind.IndicatorID)} className="text-xs text-nhs-blue hover:underline mt-1 block">
                                View indicator details →
                              </Link>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      ))}
                    </TableRow>
                    {/* Baseline row */}
                    <TableRow className="bg-gray-50 border-b-2">
                      <TableCell className="sticky left-0 z-20 bg-gray-50 font-semibold text-sm">
                        {baselineName}
                      </TableCell>
                      <TableCell className="text-center text-xs text-gray-400">—</TableCell>
                      {availableIndicators.map(ind => {
                        const val = baselineValues.get(ind.IndicatorID);
                        return (
                          <TableCell key={ind.IndicatorID} className="text-center text-xs font-medium text-gray-700 px-1">
                            {val !== null && val !== undefined ? formatValue(val, ind.FormatDisplayName) : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: Math.min(sortedAreas.length || 10, 15) }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="sticky left-0 z-10 bg-white">
                            {sortedAreas[i] ? <span className="text-sm text-gray-400">{cleanAreaName(sortedAreas[i].AreaName)}</span> : <Skeleton className="h-4 w-32" />}
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                          {(availableIndicators.length > 0 ? availableIndicators : selectedIndicators).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      sortedAreas.map((area) => {
                        const score = areaScores.get(area.AreaCode) ?? 0;
                        const scoreColor = score >= 66 ? 'text-green-700 bg-green-50' : score >= 33 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';

                        return (
                          <TableRow key={area.AreaCode} className="hover:bg-gray-50/50">
                            <TableCell className="sticky left-0 z-10 bg-white text-sm font-medium text-gray-900 max-w-[220px] truncate">
                              {cleanAreaName(area.AreaName)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={cn('text-[10px] tabular-nums cursor-help', scoreColor)}>
                                    {Math.round(score)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs font-medium">Score: {Math.round(score)} / 100</p>
                                  <p className="text-xs text-gray-400 max-w-[200px]">
                                    {score >= 66
                                      ? 'Consistently ranks near the top of this group'
                                      : score >= 33
                                      ? 'Ranks around the middle of this group'
                                      : 'Consistently ranks near the bottom of this group'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            {availableIndicators.map(ind => {
                              const val = matrix.get(area.AreaCode)?.get(ind.IndicatorID) ?? null;
                              const engVal = baselineValues.get(ind.IndicatorID) ?? null;
                              const lowerIsBetter = ind.section?.lowerIsBetter ?? false;
                              const style = getCellStyle(val, engVal, lowerIsBetter);

                              return (
                                <TableCell
                                  key={ind.IndicatorID}
                                  className={cn('text-center text-xs tabular-nums px-1', style.bg, style.text)}
                                >
                                  {val !== null ? formatValue(val, ind.FormatDisplayName) : '—'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
              {isLoading ? (
                <p className="px-4 py-2 text-[11px] text-gray-400">
                  Loading data{(levelId === SYSTEM_LEVELS.PCN || levelId === SYSTEM_LEVELS.SUB_ICB) ? ' — larger datasets may take a moment on first load' : ''}...
                </p>
              ) : sortedAreas.length > 0 && (
                <div className="flex justify-end px-4 py-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
