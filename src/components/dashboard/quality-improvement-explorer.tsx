'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Info, Minus, RotateCcw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatAbsDiff, formatDiff, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import {
  buildQualityImprovementRows,
  assessQualityImprovementRow,
  getDefaultMarkerOption,
  getMarkerGroupLabel,
  getMarkerOptions,
  type MarkerSelection,
  type Quintile,
} from '@/lib/utils/quality-improvement';
import { cn } from '@/lib/utils';

type ChangeFilter = 'all' | 'deteriorating' | 'improving' | 'stable' | 'history';
type PeerFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type SortOption = 'priority' | 'gap' | 'change' | 'name';

interface QualityImprovementExplorerProps {
  indicators: IndicatorWithData[] | undefined;
  areaName: string;
  systemLevelName?: string;
  isEngland?: boolean;
  isLoading?: boolean;
}

const CHANGE_FILTERS: Array<{ value: ChangeFilter; label: string }> = [
  { value: 'all', label: 'Any recent change' },
  { value: 'deteriorating', label: 'Deteriorating' },
  { value: 'improving', label: 'Improving' },
  { value: 'stable', label: 'Stable' },
  { value: 'history', label: 'Not enough history' },
];

const PEER_FILTERS: Array<{ value: PeerFilter; label: string }> = [
  { value: 'all', label: 'Any peer position' },
  { value: '1', label: 'Q1 — lowest values' },
  { value: '2', label: 'Q2' },
  { value: '3', label: 'Q3 — middle values' },
  { value: '4', label: 'Q4' },
  { value: '5', label: 'Q5 — highest values' },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'priority', label: 'Needs attention first' },
  { value: 'gap', label: 'Largest gap first' },
  { value: 'change', label: 'Largest recent change' },
  { value: 'name', label: 'Indicator name' },
];

function cleanIndicatorName(name: string) {
  return name.replace(/\s*\(CVDP?\d+[A-Z]*\)\s*$/i, '').trim();
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-lg" />
      <Skeleton className="h-[32rem] rounded-lg" />
    </div>
  );
}

export function QualityImprovementExplorer({
  indicators,
  areaName,
  systemLevelName,
  isEngland = false,
  isLoading,
}: QualityImprovementExplorerProps) {
  const searchParams = useSearchParams();
  const displayAreaName = areaName
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');
  const [marker, setMarker] = useState<MarkerSelection>('persons');
  const [breakdown, setBreakdown] = useState('persons');
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all');
  const [peerFilter, setPeerFilter] = useState<PeerFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [query, setQuery] = useState('');
  const [showDefinitions, setShowDefinitions] = useState(false);

  const markerOptions = useMemo(() => getMarkerOptions(indicators ?? []), [indicators]);
  const markerGroups = useMemo(() => {
    const groups = new Map<string, typeof markerOptions>();
    for (const option of markerOptions) {
      const current = groups.get(option.group) ?? [];
      current.push(option);
      groups.set(option.group, current);
    }
    return groups;
  }, [markerOptions]);
  const selectedMarkerOptions = breakdown === 'persons'
    ? []
    : markerGroups.get(breakdown) ?? [];
  const selectedMarkerLabel = marker === 'persons'
    ? null
    : markerOptions.find((option) => option.value === marker)?.label;
  const selectedBreakdownLabel = breakdown === 'persons' ? null : getMarkerGroupLabel(breakdown);
  const rows = useMemo(() => buildQualityImprovementRows(indicators ?? [], marker), [indicators, marker]);
  const assessedRows = useMemo(() => rows.map((row) => ({
    row,
    assessment: assessQualityImprovementRow(row),
  })), [rows]);

  const visibleRows = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    const statusPriority = { unfavourable: 0, similar: 1, recording: 2, favourable: 3, unavailable: 4 } as const;
    return assessedRows.filter(({ row, assessment }) => {
      const matchesQuery = !normalisedQuery
        || row.indicator.IndicatorCode.toLowerCase().includes(normalisedQuery)
        || row.indicator.IndicatorName.toLowerCase().includes(normalisedQuery)
        || row.indicator.IndicatorShortName.toLowerCase().includes(normalisedQuery);
      const matchesChange = changeFilter === 'all' || assessment.trendStatus === changeFilter;
      const matchesPeer = peerFilter === 'all' || row.quintiles.includes(Number(peerFilter) as Quintile);
      return matchesQuery && matchesChange && matchesPeer;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.row.indicator.IndicatorShortName.localeCompare(b.row.indicator.IndicatorShortName);
      if (sortBy === 'change') return Math.abs(b.row.trend ?? 0) - Math.abs(a.row.trend ?? 0);
      if (sortBy === 'gap') return Math.abs(b.assessment.gap ?? 0) - Math.abs(a.assessment.gap ?? 0);
      return statusPriority[a.assessment.status] - statusPriority[b.assessment.status]
        || Math.abs(b.assessment.performanceGap ?? 0) - Math.abs(a.assessment.performanceGap ?? 0);
    });
  }, [assessedRows, query, changeFilter, peerFilter, sortBy]);

  const hasFilters = query !== '' || breakdown !== 'persons' || changeFilter !== 'all' || peerFilter !== 'all';
  const resetFilters = () => {
    setQuery('');
    setBreakdown('persons');
    setMarker('persons');
    setChangeFilter('all');
    setPeerFilter('all');
    setSortBy('priority');
  };

  if (isLoading) return <ExplorerSkeleton />;
  if (!indicators?.length) {
    return <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-gray-500">No indicators available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {isEngland ? 'Indicator explorer' : 'Where should we focus?'}
          </h2>
          <p className="mt-0.5 max-w-3xl text-sm text-gray-500">
            {isEngland
              ? 'Filter the national indicator set by population marker and recent direction.'
              : `Find indicators where ${displayAreaName} may have room to improve compared with similar ${systemLevelName ?? 'organisations'}.`}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={showDefinitions}
          onClick={() => setShowDefinitions((visible) => !visible)}
          className="inline-flex items-center gap-1 text-xs text-nhs-blue hover:underline"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
          {showDefinitions ? 'Hide definitions' : 'How values are defined'}
        </button>
      </div>

      {showDefinitions && (
        <dl className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-gray-800">Area value</dt>
            <dd className="mt-0.5 text-gray-600">The published result for eligible patients in the selected organisation.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">Peer median</dt>
            <dd className="mt-0.5 text-gray-600">The middle value across organisations at the same level. The gap accounts for whether higher or lower values are preferred.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">System quintile</dt>
            <dd className="mt-0.5 text-gray-600">The area value&apos;s position among the same type of organisation. Q1 is lowest and Q5 highest; this is not a performance rating.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">Recent change</dt>
            <dd className="mt-0.5 text-gray-600">The change between the latest two published periods. Recorded prevalence is described as higher or lower recording rather than better or worse.</dd>
          </div>
        </dl>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid gap-3 bg-gray-50/70 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-12">
          <label className="block lg:col-span-4">
            <span className="mb-1 block text-xs font-medium text-gray-500">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Indicator, code or condition"
              className="h-9 w-full bg-white pl-9"
            />
            </span>
          </label>

          <div className="lg:col-span-3">
            <span className="mb-1 block text-xs font-medium text-gray-500">Population</span>
            <Select
              value={breakdown}
              onValueChange={(value) => {
                setBreakdown(value);
                if (value === 'persons') setMarker('persons');
                else setMarker(getDefaultMarkerOption(markerGroups.get(value) ?? [])?.value ?? 'persons');
              }}
            >
              <SelectTrigger className="w-full bg-white" aria-label="Population">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="persons">All patients (no breakdown)</SelectItem>
                {[...markerGroups.keys()].map((group) => (
                  <SelectItem key={group} value={group}>{getMarkerGroupLabel(group)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {breakdown !== 'persons' && (
            <div className="lg:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-500">Group</span>
              <Select value={marker} onValueChange={(value) => setMarker(value as MarkerSelection)}>
                <SelectTrigger className="w-full bg-white" aria-label={`${selectedBreakdownLabel} group`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectGroup>
                    <SelectLabel>{selectedBreakdownLabel}</SelectLabel>
                    {selectedMarkerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={cn('lg:col-span-2', breakdown === 'persons' && 'lg:col-span-3')}>
            <span className="mb-1 block text-xs font-medium text-gray-500">Recent change</span>
            <Select value={changeFilter} onValueChange={(value) => setChangeFilter(value as ChangeFilter)}>
              <SelectTrigger className="w-full bg-white" aria-label="Recent change">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEngland && (
            <div className="lg:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-500">Peer position</span>
              <Select value={peerFilter} onValueChange={(value) => setPeerFilter(value as PeerFilter)}>
                <SelectTrigger className="w-full bg-white" aria-label="Peer position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PEER_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedBreakdownLabel?.includes('age-standardised') && (
            <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-12">
              Age-standardised values adjust for differences in population age and should not be compared with crude values.
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white" aria-label="Filtered indicators">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div aria-live="polite">
            <p className="text-sm font-medium text-gray-800">
              {visibleRows.length} result{visibleRows.length === 1 ? '' : 's'}
            </p>
            {selectedMarkerLabel && (
              <p className="mt-0.5 text-xs text-gray-500">
                {rows.length} of {indicators.length} indicators publish data for {selectedMarkerLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button type="button" onClick={resetFilters} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-gray-600 hover:bg-gray-100">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Clear filters
              </button>
            )}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="h-8 w-44 bg-white text-xs" aria-label="Sort indicators">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(16rem,1fr)_7rem_7rem_9rem_9rem_1rem] gap-4 border-b border-gray-100 bg-gray-50/60 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:grid">
          <span>Indicator</span>
          <span className="text-right">Area result</span>
          <span className="text-right">Peer median</span>
          <span>Against median</span>
          <span>Recent change</span>
          <span />
        </div>

        {visibleRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            <p>No indicators match these filters.</p>
            <button type="button" onClick={resetFilters} className="mt-2 font-medium text-nhs-blue hover:underline">Clear filters</button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleRows.map(({ row, assessment }) => {
              const TrendIcon = row.trendDirection === 'up'
                ? TrendingUp
                : row.trendDirection === 'down'
                  ? TrendingDown
                  : Minus;
              return (
                <li key={`${row.indicator.IndicatorID}-${row.category.MetricID}`}>
                  <Link
                    href={buildUrl(`/dashboard/${row.indicator.IndicatorID}`, searchParams)}
                    className="group grid gap-3 px-4 py-3 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:px-5 lg:grid-cols-[minmax(16rem,1fr)_7rem_7rem_9rem_9rem_1rem] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800 group-hover:text-nhs-blue" title={cleanIndicatorName(row.indicator.IndicatorShortName)}>
                        {cleanIndicatorName(row.indicator.IndicatorShortName)}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-gray-400">
                        <span className="font-mono">{row.indicator.IndicatorCode}</span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
                      <span className="text-xs text-gray-400 lg:hidden">Area value</span>
                      <span className="text-sm font-semibold tabular-nums text-gray-900">{formatValue(row.value, row.indicator.FormatDisplayName)}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
                      <span className="text-xs text-gray-400 lg:hidden">Peer median</span>
                      <span>
                        <span className="block text-sm tabular-nums text-gray-600">
                          {isEngland || row.median === null ? '—' : formatValue(row.median, row.indicator.FormatDisplayName)}
                        </span>
                        {!isEngland && row.quintiles.length > 0 && (
                          <span className="mt-0.5 block text-[10px] text-gray-400">Area is Q{row.quintiles.join('–')}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs font-medium">
                      <span className="text-gray-400 lg:hidden">Against median</span>
                      {assessment.gap === null || isEngland ? (
                        <span className="text-gray-400">Not available</span>
                      ) : assessment.status === 'similar' ? (
                        <span className="text-gray-500">Similar</span>
                      ) : assessment.status === 'recording' ? (
                        <span className="text-gray-600">{formatAbsDiff(assessment.gap, row.indicator.FormatDisplayName)} {assessment.gap > 0 ? 'higher' : 'lower'} recording</span>
                      ) : (
                        <span className={assessment.status === 'favourable' ? 'text-nhs-green' : 'text-nhs-red'}>
                          {formatAbsDiff(assessment.gap, row.indicator.FormatDisplayName)} {assessment.status === 'favourable' ? 'better' : 'worse'}
                        </span>
                      )}
                    </div>

                    <div className={cn(
                      'flex items-center justify-between gap-2 text-xs font-medium lg:justify-start',
                      assessment.trendStatus === 'improving' ? 'text-nhs-green'
                        : assessment.trendStatus === 'deteriorating' ? 'text-nhs-red'
                          : 'text-gray-500'
                    )}>
                      <span className="text-gray-400 lg:hidden">Recent change</span>
                      <span className="inline-flex items-center gap-1">
                        {row.trendDirection !== null && <TrendIcon className="h-3.5 w-3.5" aria-hidden />}
                        {row.trend === null
                          ? 'Not enough history'
                          : assessment.trendStatus === 'stable'
                            ? 'Stable'
                            : assessment.trendStatus === 'recording'
                              ? `${row.trendDirection === 'up' ? 'Increasing' : 'Decreasing'} ${formatDiff(row.trend, row.indicator.FormatDisplayName)}`
                              : `${assessment.trendStatus === 'improving' ? 'Improving' : 'Deteriorating'} ${formatDiff(row.trend, row.indicator.FormatDisplayName)}`}
                      </span>
                    </div>

                    <ArrowRight className="hidden h-4 w-4 text-gray-300 group-hover:text-nhs-blue lg:block" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
