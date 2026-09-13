'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatAbsDiff, formatNumber, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import {
  classifyOpportunityEmpty,
  countUnscoredOpportunity,
  opportunityFor,
  type OpportunityEmptyReason,
  type LensRow,
  type OpportunityTarget,
} from '@/lib/utils/improvement-lenses';
import type { ComparisonArea } from '@/lib/hooks/use-comparison-areas';
import { cn } from '@/lib/utils';
import { ColumnHeadings, EmptyLens, IndicatorName, LensHeader, MobileLabel } from './lens-shared';

type SortOption = 'patients' | 'gap' | 'cohort' | 'name';

interface OpportunityLensProps {
  rows: LensRow[];
  areaName: string;
  systemLevelName: string;
  target: OpportunityTarget;
  onTargetChange: (target: OpportunityTarget) => void;
  /** Areas above this one, nearest first. */
  comparisons: ComparisonArea[];
  isLoadingAncestors?: boolean;
}

const COLUMNS = 'lg:grid-cols-[minmax(14rem,1.3fr)_minmax(9rem,1fr)_6.5rem_11rem_6rem_1rem]';

function targetLabel(target: OpportunityTarget, systemLevelName: string, comparison: ComparisonArea | undefined) {
  const level = systemLevelName.replace(/s$/, '');
  if (target === 'top') return `the top-fifth ${level} in England`;
  if (target.startsWith('area:')) return comparison?.name ?? 'the comparison area';
  return `the median ${level} in England`;
}

function emptyCopy(
  reason: OpportunityEmptyReason,
  areaName: string,
  label: string,
  levelSingular: string,
): { title?: string; body: string } {
  switch (reason) {
    case 'no-rows':
      return { title: 'No indicators match', body: 'Try another stage or clear the search.' };
    case 'loading-comparison':
      return { title: `Loading ${label}`, body: 'Rates for this comparison are still arriving.' };
    case 'comparison-unavailable':
      return {
        title: `No published comparison with ${label}`,
        body: `CVDPREVENT has not published matching rates for ${label} on these indicators.`,
      };
    case 'peer-range-unavailable':
      return {
        title: 'No published peer range',
        body: `These indicators have no published ${levelSingular} median or top-fifth, so extra patients cannot be estimated. Compare with a parent organisation, or use Position & direction.`,
      };
    case 'no-opportunity':
      return {
        title: 'Cannot estimate extra patients',
        body: 'Mortality, admission and prevalence indicators cannot be turned into patient counts. Use Position & direction for those.',
      };
    case 'at-target':
      return { body: `${areaName} already matches or beats ${label} on every indicator here.` };
  }
}

export function OpportunityLens({ rows, areaName, systemLevelName, target, onTargetChange, comparisons, isLoadingAncestors = false }: OpportunityLensProps) {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>('patients');
  const [showAtTarget, setShowAtTarget] = useState(false);

  const comparison = comparisons.find((candidate) => `area:${candidate.id}` === target);
  const { active, atTarget, rates, opportunityCount, scoredCount } = useMemo(() => {
    const withOpportunity = rows.filter((row) => row.opportunity !== null);
    const rates = rows.filter((row) => row.opportunity === null && row.section.id === 'outcomes');
    const scored = withOpportunity.map((row) => ({ row, ...opportunityFor(row, target, comparison?.values) }));
    const sorter = (a: typeof scored[number], b: typeof scored[number]) => {
      if (sortBy === 'name') return a.row.indicator.IndicatorShortName.localeCompare(b.row.indicator.IndicatorShortName);
      if (sortBy === 'gap') return (b.gap ?? -Infinity) - (a.gap ?? -Infinity);
      if (sortBy === 'cohort') return (b.row.denominator ?? 0) - (a.row.denominator ?? 0);
      return (b.patients ?? -1) - (a.patients ?? -1) || (b.gap ?? 0) - (a.gap ?? 0);
    };
    const available = scored.filter((item) => item.patients !== null);
    return {
      active: available.filter((item) => item.patients! > 0).sort(sorter),
      atTarget: available.filter((item) => item.patients === 0).sort(sorter),
      rates,
      opportunityCount: withOpportunity.length,
      scoredCount: available.length,
    };
  }, [rows, target, sortBy, comparison]);

  const maxPatients = Math.max(1, ...active.map((item) => item.patients ?? 0));
  const totalPatients = active.reduce((sum, item) => sum + (item.patients ?? 0), 0);
  const label = targetLabel(target, systemLevelName, comparison);
  const shortLabel = target === 'top' ? 'top fifth' : comparison ? comparison.name : 'median';
  const levelSingular = systemLevelName.replace(/s$/, '');
  const emptyReason = classifyOpportunityEmpty({
    filteredRowCount: rows.length,
    opportunityCount,
    scoredCount,
    activeCount: active.length,
    target,
    comparison: comparison ? { isLoading: comparison.isLoading, valueCount: comparison.values.size } : null,
    ancestorsLoading: isLoadingAncestors,
  });
  const empty = emptyReason ? emptyCopy(emptyReason, areaName, label, levelSingular) : null;
  const unscoredCount = countUnscoredOpportunity(rows, target, comparison?.values);

  const renderRow = ({ row, patients, gap }: { row: LensRow; patients: number | null; gap: number | null }) => {
    const fmt = row.indicator.FormatDisplayName;
    const toMedian = target === 'top' ? row.opportunity?.toMedian ?? null : null;
    const targetValue = target === 'top' ? row.topFifth : comparison ? comparison.values.get(row.indicator.IndicatorCode) ?? null : row.peer?.median ?? null;
    return (
      <li key={row.indicator.IndicatorID}>
        <Link
          href={buildUrl(`/dashboard/${row.indicator.IndicatorID}`, searchParams)}
          className={cn('group grid gap-3 px-4 py-3 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:px-5 lg:items-center lg:gap-4', COLUMNS)}
        >
          <IndicatorName
            row={row}
            extra={row.opportunity?.flagged !== null && row.opportunity?.flagged !== undefined
              ? <span>{formatNumber(row.opportunity.flagged)} patients flagged</span>
              : undefined}
          />

          <div className="flex items-center gap-3">
            <MobileLabel>Patients</MobileLabel>
            <div className="relative h-3.5 w-full overflow-hidden rounded-sm bg-gray-100" role="img" aria-label={`${formatNumber(patients ?? 0)} extra patients if ${areaName} matched ${label}`}>
              <div className="absolute inset-y-0 left-0 rounded-r-sm bg-blue-100" style={{ width: `${((patients ?? 0) / maxPatients) * 100}%` }} />
              {toMedian !== null && (
                <div className="absolute inset-y-0 left-0 rounded-r-sm bg-nhs-blue" style={{ width: `${(toMedian / maxPatients) * 100}%` }} />
              )}
              {toMedian === null && (
                <div className="absolute inset-y-0 left-0 rounded-r-sm bg-nhs-blue" style={{ width: `${((patients ?? 0) / maxPatients) * 100}%` }} />
              )}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
            <MobileLabel>Extra patients</MobileLabel>
            <span>
              <span className="block text-sm font-semibold tabular-nums text-gray-900">{formatNumber(patients ?? 0)}</span>
              {toMedian !== null && (
                <span className="block text-[10px] tabular-nums text-gray-400">{toMedian > 0 ? `${formatNumber(toMedian)} to median` : 'above median'}</span>
              )}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 lg:block">
            <MobileLabel>Our result</MobileLabel>
            <span>
              <span className="block text-sm font-semibold tabular-nums text-gray-900">{formatValue(row.value, fmt)}</span>
              <span className="block text-[10px] tabular-nums text-gray-400">
                {shortLabel} {targetValue !== null ? formatValue(targetValue, fmt) : '—'}{gap !== null && gap > 0 ? ` · ${formatAbsDiff(gap, fmt)} gap` : ''}
              </span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
            <MobileLabel>Eligible patients</MobileLabel>
            <span className="block text-xs tabular-nums text-gray-600">{row.denominator !== null ? formatNumber(row.denominator) : '—'}</span>
          </div>

          <ArrowRight className="hidden h-4 w-4 text-gray-300 group-hover:text-nhs-blue lg:block" aria-hidden />
        </Link>
      </li>
    );
  };

  return (
    <>
      <LensHeader
        title={`Extra patients treated if ${areaName}'s rate matched ${label}`}
        description={<>For each indicator: (their rate − {areaName}&apos;s rate) × {areaName}&apos;s eligible patients. Simple arithmetic, not a forecast.{totalPatients > 0 && <> Total below: <b className="text-gray-700">{formatNumber(totalPatients)}</b> patients.</>}</>}
      >
        <Select value={target} onValueChange={(value) => onTargetChange(value as OpportunityTarget)}>
          <SelectTrigger className="h-9 w-full min-w-0 gap-2 bg-white text-xs sm:h-8 sm:w-auto sm:min-w-48" aria-label="Compare with">
            <span className="text-gray-400">Compare with</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="median">Median {levelSingular} in England</SelectItem>
            <SelectItem value="top">Top-fifth {levelSingular} in England</SelectItem>
            {isLoadingAncestors && target.startsWith('area:') && !comparison && (
              <SelectItem value={target}>Loading parent area…</SelectItem>
            )}
            {comparisons.map((candidate) => (
              <SelectItem key={candidate.id} value={`area:${candidate.id}`}>
                {candidate.name}{candidate.levelName && candidate.levelName !== 'England' ? ` (${candidate.levelName})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoadingAncestors && (
          <span className="text-[11px] text-gray-400">Loading parent areas…</span>
        )}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="h-9 w-full min-w-0 gap-2 bg-white text-xs sm:h-8 sm:w-auto sm:min-w-36" aria-label="Sort">
            <span className="text-gray-400">Sort</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="patients">Most patients</SelectItem>
            <SelectItem value="gap">Largest gap</SelectItem>
            <SelectItem value="cohort">Largest cohort</SelectItem>
            <SelectItem value="name">Indicator name</SelectItem>
          </SelectContent>
        </Select>
      </LensHeader>

      <ColumnHeadings columns={COLUMNS} labels={['Indicator', 'Extra patients if we matched them', '>Patients', 'Our result', '>Eligible', '']} />

      {empty ? (
        <EmptyLens title={empty.title}>{empty.body}</EmptyLens>
      ) : (
        <ul className="divide-y divide-gray-100">{active.map(renderRow)}</ul>
      )}
      {unscoredCount > 0 && active.length > 0 && (
        <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 sm:px-5">
          {unscoredCount} indicator{unscoredCount === 1 ? '' : 's'} {unscoredCount === 1 ? 'has' : 'have'} no published rate for {label}, so {unscoredCount === 1 ? 'it is' : 'they are'} left out of this list.
        </p>
      )}

      {atTarget.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            aria-expanded={showAtTarget}
            onClick={() => setShowAtTarget((visible) => !visible)}
            className="flex w-full items-center justify-between gap-3 bg-gray-50/70 px-4 py-2.5 text-left text-xs font-medium text-gray-600 hover:bg-gray-100 sm:px-5"
          >
            <span>{atTarget.length} indicator{atTarget.length === 1 ? '' : 's'} where {areaName} already matches or beats {label}</span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', showAtTarget && 'rotate-180')} aria-hidden />
          </button>
          {showAtTarget && <ul className="divide-y divide-gray-100 border-t border-gray-100">{atTarget.map(renderRow)}</ul>}
        </div>
      )}

      {rates.length > 0 && (
        <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 sm:px-5">
          {rates.length} mortality and admission rate{rates.length === 1 ? '' : 's'} cannot be turned into patient counts. Use Position &amp; direction for those.
        </p>
      )}
    </>
  );
}
