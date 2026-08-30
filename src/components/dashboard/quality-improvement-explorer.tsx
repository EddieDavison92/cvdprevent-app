'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Info, RotateCcw, Search } from 'lucide-react';
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
import { Sparkline } from '@/components/charts/sparkline';
import { PeerRangeBar, STATUS_META } from '@/components/dashboard/peer-range-bar';
import { NHS_COLORS } from '@/lib/constants/colors';
import type { IndicatorWithData } from '@/lib/api/types';
import { formatAbsDiff, formatDiff, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { classifyIndicator } from '@/lib/constants/indicator-sections';
import {
  buildQualityImprovementRows,
  assessQualityImprovementRow,
  countSuppressedCategories,
  getDefaultMarkerOption,
  getMarkerGroupLabel,
  getMarkerOptions,
  type MarkerSelection,
  type PerformanceStatus,
} from '@/lib/utils/quality-improvement';
import { cn } from '@/lib/utils';

type ChangeFilter = 'all' | 'deteriorating' | 'improving' | 'stable' | 'history';
type StatusFilter = 'all' | PerformanceStatus;
type SortOption = 'priority' | 'gap' | 'change' | 'name';

interface QualityImprovementExplorerProps {
  indicators: IndicatorWithData[] | undefined;
  areaName: string;
  systemLevelName?: string;
  isEngland?: boolean;
  isLoading?: boolean;
}

const CHANGE_FILTERS: Array<{ value: ChangeFilter; label: string }> = [
  { value: 'all', label: 'Any trend' },
  { value: 'deteriorating', label: 'Deteriorating' },
  { value: 'improving', label: 'Improving' },
  { value: 'stable', label: 'Stable' },
  { value: 'history', label: 'Not enough history' },
];

const STATUS_ORDER: PerformanceStatus[] = ['unfavourable', 'similar', 'favourable', 'recording'];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'priority', label: 'Needs attention first' },
  { value: 'gap', label: 'Largest gap first' },
  { value: 'change', label: 'Largest trend change' },
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
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [query, setQuery] = useState('');
  const [showDefinitions, setShowDefinitions] = useState(false);

  const markerOptions = useMemo(() => getMarkerOptions(indicators ?? []), [indicators]);
  const sectionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const indicator of indicators ?? []) {
      const { section } = classifyIndicator(indicator);
      if (!seen.has(section.id)) seen.set(section.id, section.name);
    }
    const order = ['prevalence', 'detection', 'treatment', 'control', 'monitoring', 'outcomes', 'other'];
    return order.filter((id) => seen.has(id)).map((id) => ({ id, name: seen.get(id)! }));
  }, [indicators]);
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
  const suppressedCount = useMemo(
    () => countSuppressedCategories(indicators ?? [], marker),
    [indicators, marker],
  );
  const assessedRows = useMemo(() => rows.map((row) => ({
    row,
    assessment: assessQualityImprovementRow(row),
  })), [rows]);

  const statusCounts = useMemo(() => {
    const counts: Record<PerformanceStatus, number> = { unfavourable: 0, similar: 0, favourable: 0, recording: 0, unavailable: 0 };
    for (const { assessment } of assessedRows) counts[assessment.status] += 1;
    return counts;
  }, [assessedRows]);

  const visibleRows = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    const statusPriority = { unfavourable: 0, similar: 1, recording: 2, favourable: 3, unavailable: 4 } as const;
    return assessedRows.filter(({ row, assessment }) => {
      const matchesQuery = !normalisedQuery
        || row.indicator.IndicatorCode.toLowerCase().includes(normalisedQuery)
        || row.indicator.IndicatorName.toLowerCase().includes(normalisedQuery)
        || row.indicator.IndicatorShortName.toLowerCase().includes(normalisedQuery);
      const matchesChange = changeFilter === 'all' || assessment.trendStatus === changeFilter;
      const matchesSection = sectionFilter === 'all' || classifyIndicator(row.indicator).section.id === sectionFilter;
      const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
      return matchesQuery && matchesChange && matchesSection && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.row.indicator.IndicatorShortName.localeCompare(b.row.indicator.IndicatorShortName);
      if (sortBy === 'change') return Math.abs(b.row.overallTrend ?? 0) - Math.abs(a.row.overallTrend ?? 0);
      if (sortBy === 'gap') return Math.abs(b.assessment.gap ?? 0) - Math.abs(a.assessment.gap ?? 0);
      return statusPriority[a.assessment.status] - statusPriority[b.assessment.status]
        || Math.abs(b.assessment.performanceGap ?? 0) - Math.abs(a.assessment.performanceGap ?? 0);
    });
  }, [assessedRows, query, changeFilter, sectionFilter, statusFilter, sortBy]);

  const hasFilters = query !== '' || breakdown !== 'persons' || changeFilter !== 'all' || sectionFilter !== 'all' || statusFilter !== 'all';
  const resetFilters = () => {
    setQuery('');
    setBreakdown('persons');
    setMarker('persons');
    setChangeFilter('all');
    setSectionFilter('all');
    setStatusFilter('all');
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
              : `Each row compares ${displayAreaName} with every ${systemLevelName ?? 'organisation'} in England on one indicator. The dot is ${displayAreaName}'s position on the range of peer values; the dark line is the peer median. Red rows are behind peers, green rows are ahead.`}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={showDefinitions}
          onClick={() => setShowDefinitions((visible) => !visible)}
          className="inline-flex items-center gap-1 text-xs text-nhs-blue hover:underline"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
          {showDefinitions ? 'Hide detail' : 'More detail'}
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
            <dd className="mt-0.5 text-gray-600">The middle value across all organisations of the same type in England (not just the region). The gap accounts for whether higher or lower values are preferred.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">Peer range</dt>
            <dd className="mt-0.5 text-gray-600">The bar runs from the lowest to the highest value among all organisations of the same type in England, split into quintiles. The dark line is the median; the dot is this area.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">Trend</dt>
            <dd className="mt-0.5 text-gray-600">Change between the latest two published periods. Recorded prevalence is described as rising or falling rather than better or worse.</dd>
          </div>
        </dl>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid gap-3 bg-gray-50/70 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-12">
          <label className={cn('block', breakdown === 'persons' ? 'lg:col-span-5' : 'lg:col-span-3')}>
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

          <div className="lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-500">Trend</span>
            <Select value={changeFilter} onValueChange={(value) => setChangeFilter(value as ChangeFilter)}>
              <SelectTrigger className="w-full bg-white" aria-label="Trend">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-500">Category</span>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full bg-white" aria-label="Indicator category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {sectionOptions.map((section) => (
                  <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {selectedBreakdownLabel?.includes('age-standardised') && (
            <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-12">
              Age-standardised values adjust for differences in population age and should not be compared with crude values.
            </p>
          )}
        </div>
      </section>

      {!isEngland && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by position against peers">
          {(['all', ...STATUS_ORDER.filter((status) => statusCounts[status] > 0)] as StatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter((current) => (current === status && status !== 'all' ? 'all' : status))}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                statusFilter === status ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {status !== 'all' && <span className={cn('h-2 w-2 rounded-full', STATUS_META[status].dot)} aria-hidden />}
              {status === 'all' ? 'All' : STATUS_META[status].label}
              <span className="tabular-nums opacity-70">{status === 'all' ? assessedRows.length : statusCounts[status]}</span>
            </button>
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white" aria-label="Filtered indicators">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div aria-live="polite">
            <p className="text-sm font-medium text-gray-800">
              {visibleRows.length} result{visibleRows.length === 1 ? '' : 's'}
            </p>
            {selectedMarkerLabel && (
              <p className="mt-0.5 text-xs text-gray-500">
                {rows.length} of {indicators.length} indicators publish data for {selectedMarkerLabel}
                {suppressedCount > 0 && ` · ${suppressedCount} suppressed because counts are small`}
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

        <div className="hidden grid-cols-[minmax(14rem,1fr)_7rem_10rem_8rem_13rem_1rem] gap-4 border-b border-gray-100 bg-gray-50/60 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:grid">
          <span>Indicator</span>
          <span className="text-right">Area result</span>
          <span>Peer range</span>
          <span>Against median</span>
          <span>Trend</span>
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
              return (
                <li key={`${row.indicator.IndicatorID}-${row.category.MetricID}`}>
                  <Link
                    href={buildUrl(`/dashboard/${row.indicator.IndicatorID}`, searchParams)}
                    className={cn(
                      'group grid gap-3 border-l-4 px-4 py-3 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:px-5 lg:grid-cols-[minmax(14rem,1fr)_7rem_10rem_8rem_13rem_1rem] lg:items-center lg:gap-4',
                      isEngland ? 'border-l-transparent' : STATUS_META[assessment.status].stripe,
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800 group-hover:text-nhs-blue" title={cleanIndicatorName(row.indicator.IndicatorShortName)}>
                        {cleanIndicatorName(row.indicator.IndicatorShortName)}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-gray-400">
                        <span className="font-mono">{row.indicator.IndicatorCode}</span>
                        {!isEngland && (
                          <span className={cn('inline-flex items-center gap-1 font-medium', STATUS_META[assessment.status].text)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[assessment.status].dot)} aria-hidden />
                            {STATUS_META[assessment.status].label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
                      <span className="text-xs text-gray-400 lg:hidden">Area value</span>
                      <span>
                        <span className="block text-sm font-semibold tabular-nums text-gray-900">{formatValue(row.value, row.indicator.FormatDisplayName)}</span>
                        {!isEngland && row.median !== null && (
                          <span className="mt-0.5 block text-[10px] tabular-nums text-gray-400">median {formatValue(row.median, row.indicator.FormatDisplayName)}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400 lg:hidden">Peer range</span>
                      <div className="w-full max-w-[10rem]">
                        {isEngland ? <span className="text-xs text-gray-400">—</span> : (
                          <PeerRangeBar
                            value={row.value}
                            min={row.min}
                            max={row.max}
                            median={row.median}
                            quintileBounds={[row.category.Data.Q20, row.category.Data.Q40, row.category.Data.Q60, row.category.Data.Q80]}
                            areaLabel={displayAreaName}
                            status={assessment.status}
                            formatDisplayName={row.indicator.FormatDisplayName}
                          />
                        )}
                      </div>
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
                      <span className="text-gray-400 lg:hidden">Trend</span>
                      <span className="inline-flex items-center gap-2">
                        {row.trendValues.length >= 2 && (
                          <Sparkline
                            data={row.trendValues.map((y, i) => ({ x: String(i), y }))}
                            width={56}
                            height={26}
                            showArea={false}
                            color={assessment.trendStatus === 'improving' ? NHS_COLORS.green : assessment.trendStatus === 'deteriorating' ? NHS_COLORS.red : NHS_COLORS.midGrey}
                          />
                        )}
                        <span>
                          {row.overallTrend === null
                            ? 'Not enough history'
                            : assessment.trendStatus === 'stable'
                              ? 'Stable'
                              : assessment.trendStatus === 'recording'
                                ? `${row.trendDirection === 'up' ? 'Rising' : 'Falling'} ${formatDiff(row.overallTrend, row.indicator.FormatDisplayName)}`
                                : `${assessment.trendStatus === 'improving' ? 'Improving' : 'Deteriorating'} ${formatDiff(row.overallTrend, row.indicator.FormatDisplayName)}`}
                        </span>
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
