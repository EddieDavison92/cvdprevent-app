'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatAbsDiff, formatDiff, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { getMarkerGroupLabel, type PopulationDimension } from '@/lib/utils/quality-improvement';
import { buildGroupRows, INEQUALITY_DIMENSIONS, ORDERED_DIMENSIONS, type GroupCell, type GroupRow, type LensRow } from '@/lib/utils/improvement-lenses';
import { cn } from '@/lib/utils';
import { cleanIndicatorName, EmptyLens, LensHeader } from './lens-shared';

type SortOption = 'gradient' | 'gap' | 'name';

interface InequalitiesLensProps {
  rows: LensRow[];
  dimension: PopulationDimension;
  onDimensionChange: (dimension: PopulationDimension) => void;
}

/** ColorBrewer YlGnBu, light to dark. */
const YLGNBU = [[255, 255, 204], [161, 218, 180], [65, 182, 196], [44, 127, 184], [37, 52, 148]];
const GREYS = [[247, 247, 247], [217, 217, 217], [189, 189, 189], [150, 150, 150], [99, 99, 99]];

function ramp(stops: number[][], t: number) {
  const position = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const fraction = position - index;
  const mix = (channel: number) => Math.round(stops[index][channel] + (stops[index + 1][channel] - stops[index][channel]) * fraction);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

/** Colours how far a group is behind; ahead cells stay plain. Descriptive rows colour difference either way in grey. */
function cellStyle(diff: number | null, scale: number, descriptive: boolean) {
  if (diff === null) return {};
  const magnitude = descriptive ? Math.abs(diff) : Math.max(0, -diff);
  if (magnitude < 0.05) return {};
  const t = Math.min(1, magnitude / scale);
  return {
    backgroundColor: ramp(descriptive ? GREYS : YLGNBU, t),
    color: t > 0.55 ? '#fff' : '#1f2937',
  };
}

function describe(cell: GroupCell, overallValue: number, fmt: string, descriptive: boolean, lowerIsBetter: boolean) {
  if (cell.suppressed) return `${cell.label}: suppressed (small numbers)`;
  if (cell.value === null || cell.diff === null) return cell.label;
  const raw = cell.value - overallValue;
  const word = descriptive ? (raw > 0 ? 'higher' : 'lower') : cell.diff < 0 ? 'behind' : 'ahead';
  return `${cell.label}: ${formatValue(cell.value, fmt)} · ${formatAbsDiff(raw, fmt)} ${word} the all-patient result${lowerIsBetter && !descriptive ? ' (lower is better)' : ''}`;
}

export function InequalitiesLens({ rows, dimension, onDimensionChange }: InequalitiesLensProps) {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>('gradient');
  const ordered = ORDERED_DIMENSIONS.has(dimension);
  const effectiveSort = sortBy === 'gradient' && !ordered ? 'gap' : sortBy;

  const availableDimensions = useMemo(() => {
    const present = new Set<string>();
    for (const row of rows) for (const category of row.indicator.Categories) present.add(category.MetricCategoryTypeName);
    return INEQUALITY_DIMENSIONS.filter((candidate) => present.has(candidate));
  }, [rows]);

  const { care, prevalence, columns, scale, gradientCount } = useMemo(() => {
    const groupRows = buildGroupRows(rows, dimension);
    const sorter = (a: GroupRow, b: GroupRow) => {
      if (effectiveSort === 'name') return a.row.indicator.IndicatorShortName.localeCompare(b.row.indicator.IndicatorShortName);
      if (effectiveSort === 'gradient') return Math.abs(b.gradient ?? 0) - Math.abs(a.gradient ?? 0) || (a.worstDiff ?? 0) - (b.worstDiff ?? 0);
      return (a.worstDiff ?? 0) - (b.worstDiff ?? 0);
    };
    const care = groupRows.filter((group) => !group.row.isRecordedPrevalence).sort(sorter);
    const prevalence = groupRows.filter((group) => group.row.isRecordedPrevalence).sort(sorter);
    const labels = new Map<string, number>();
    for (const group of groupRows) {
      for (const cell of group.cells) {
        // Unranked groups (missing or not stated ethnicity) sit after the ranked ones.
        if (!labels.has(cell.label)) labels.set(cell.label, cell.order + (cell.isUnclassified ? 1000 : 0));
      }
    }
    const columns = [...labels.entries()].sort((a, b) => a[1] - b[1]).map(([label]) => label);
    const magnitudes = groupRows.flatMap((group) => group.cells.filter((cell) => cell.diff !== null && group.row.isPercentage).map((cell) => Math.abs(cell.diff!))).sort((a, b) => a - b);
    const scale = Math.max(4, magnitudes[Math.floor(magnitudes.length * 0.9)] ?? 6);
    const gradientCount = care.filter((group) => group.gradient !== null && group.gradient >= 2).length;
    return { care, prevalence, columns, scale, gradientCount };
  }, [rows, dimension, effectiveSort]);

  const dimensionLabel = getMarkerGroupLabel(dimension);
  const groupCount = care.length + prevalence.length;

  const renderRow = (group: GroupRow, descriptive: boolean) => {
    const { row } = group;
    const fmt = row.indicator.FormatDisplayName;
    const rowScale = row.isPercentage ? scale : Math.max(Math.abs(group.overallValue) * 0.1, Number.EPSILON);
    const byLabel = new Map(group.cells.map((cell) => [cell.label, cell]));
    return (
      <tr key={row.indicator.IndicatorID} className="group border-t border-gray-100 hover:bg-nhs-pale-grey/30">
        <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-normal group-hover:bg-nhs-pale-grey/30 sm:px-5">
          <Link href={buildUrl(`/dashboard/${row.indicator.IndicatorID}`, searchParams)} className="block min-w-0 hover:text-nhs-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue">
            <span className="block truncate text-sm text-gray-800" title={cleanIndicatorName(row.indicator.IndicatorShortName)}>{cleanIndicatorName(row.indicator.IndicatorShortName)}</span>
            <span className="block text-[11px] text-gray-400"><span className="font-mono">{row.indicator.IndicatorCode}</span> · all patients {formatValue(group.overallValue, fmt)}</span>
          </Link>
        </th>
        {columns.map((label) => {
          const cell = byLabel.get(label);
          if (!cell) return <td key={label} className="px-2 py-2 text-center text-xs text-gray-300" title={`${label}: not published`}>–</td>;
          const isUnclassified = cell.isUnclassified;
          return (
            <td
              key={label}
              className={cn('px-2 py-2 text-center text-xs tabular-nums', isUnclassified ? 'text-gray-400' : 'text-gray-500', cell.suppressed && 'text-gray-300')}
              style={isUnclassified ? undefined : cellStyle(cell.diff, rowScale, descriptive)}
              title={describe(cell, group.overallValue, fmt, descriptive, row.lowerIsBetter)}
            >
              {cell.suppressed || cell.value === null
                ? '–'
                  : isUnclassified
                    ? formatValue(cell.value, fmt)
                    : Math.abs(cell.value - group.overallValue) < 0.05
                      ? '·'
                      : formatDiff(cell.value - group.overallValue, fmt)}
            </td>
          );
        })}
        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-gray-800 sm:px-5">
          {ordered && group.gradient !== null
            ? formatDiff(group.gradient, fmt)
            : group.worstDiff !== null ? formatDiff(group.worstDiff, fmt) : '—'}
        </td>
      </tr>
    );
  };

  return (
    <>
      <LensHeader
        title={`Each group compared with all patients, by ${dimensionLabel.toLowerCase()}`}
        description={<>
          Darker means further behind the all-patient result. Plain cells are level or ahead. A dash means not published, usually because too few patients.
          {ordered && dimension.startsWith('Deprivation') && care.length > 0 && <> The least deprived group is 2pp or more ahead on <b className="text-gray-700">{gradientCount} of {care.length}</b> indicators.</>}
          {dimension.startsWith('Ethnicity') && <> Missing and not-stated ethnicity are shown but not ranked.</>}
        </>}
      >
        <Select value={effectiveSort} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="h-8 w-auto min-w-40 gap-2 bg-white text-xs" aria-label="Sort">
            <span className="text-gray-400">Sort</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ordered && <SelectItem value="gradient">Steepest gradient</SelectItem>}
            <SelectItem value="gap">Largest group behind</SelectItem>
            <SelectItem value="name">Indicator name</SelectItem>
          </SelectContent>
        </Select>
      </LensHeader>

      <div className="flex flex-wrap gap-1.5 px-4 py-3 sm:px-5" role="tablist" aria-label="Population breakdown">
        {availableDimensions.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={candidate === dimension}
            onClick={() => onDimensionChange(candidate)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue',
              candidate === dimension ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {getMarkerGroupLabel(candidate)}
          </button>
        ))}
      </div>

      {groupCount === 0 ? (
        <EmptyLens>No indicators publish a {dimensionLabel.toLowerCase()} breakdown for this selection.</EmptyLens>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/60 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-4 py-2 text-left sm:px-5">Indicator</th>
                {columns.map((label) => <th key={label} scope="col" className={cn('px-2 py-2 text-center font-medium normal-case tracking-normal', /^(missing|not stated|unknown|not known|not recorded)$/i.test(label) && 'text-gray-400')}>{label}</th>)}
                <th scope="col" className="px-4 py-2 text-right sm:px-5">{ordered ? (dimension.startsWith('Age') ? 'Oldest minus youngest' : 'Least minus most deprived') : 'Largest group behind'}</th>
              </tr>
            </thead>
            <tbody>
              {care.map((group) => renderRow(group, false))}
              {prevalence.length > 0 && (
                <>
                  <tr><td colSpan={columns.length + 2} className="border-t border-gray-100 bg-slate-50 px-4 py-2 text-xs text-gray-600 sm:px-5"><b className="font-semibold text-gray-800">Recorded prevalence</b> · grey shows difference either way, because recording is not better or worse.</td></tr>
                  {prevalence.map((group) => renderRow(group, true))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
