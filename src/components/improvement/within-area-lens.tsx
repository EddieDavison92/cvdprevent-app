'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWithinArea, type WithinDepth } from '@/lib/hooks/use-within-area';
import type { SiblingDataItem } from '@/lib/api/types';
import { formatNumber, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import type { LensRow } from '@/lib/utils/improvement-lenses';
import { cn } from '@/lib/utils';
import { cleanAreaName, ColumnHeadings, EmptyLens, IndicatorName, LensHeader, MobileLabel } from './lens-shared';

type SortOption = 'spread' | 'name';

interface WithinAreaLensProps {
  rows: LensRow[];
  areaId: number | undefined;
  areaName: string;
  timePeriodId: number | undefined;
  active: boolean;
  defaultDepth: WithinDepth;
  /** Plural peer level, for the median legend. */
  peersLabel: string;
}

const LEVEL_NAMES: Record<number, string> = { 1: 'England', 6: 'Region', 7: 'ICB', 8: 'Sub-ICB', 4: 'PCN', 5: 'Practice' };
const COLUMNS = 'lg:grid-cols-[minmax(14rem,1.1fr)_minmax(16rem,2fr)_10rem_1.5rem]';

interface RankedItem extends SiblingDataItem {
  /** 1 is the best result for the indicator's polarity. */
  rank: number;
}

interface StripRow {
  row: LensRow;
  /** Best first. */
  ranked: RankedItem[];
  min: number;
  max: number;
  relativeSpread: number;
}

interface HoverState {
  areaId: number;
  name: string;
  value: string;
  rank: number;
  of: number;
  denominator: number | null;
  indicator: string;
  x: number;
  y: number;
}

function Strip({
  strip, areaName, highlightedAreaId, onHover, onLeave,
}: {
  strip: StripRow;
  areaName: string;
  highlightedAreaId: number | null;
  onHover: (item: RankedItem, event: MouseEvent) => void;
  onLeave: () => void;
}) {
  const { row, ranked, min, max } = strip;
  const fmt = row.indicator.FormatDisplayName;
  const median = row.peer?.median ?? null;
  const lo = Math.min(min, row.value, median ?? row.value);
  const hi = Math.max(max, row.value, median ?? row.value);
  const pad = (hi - lo) * 0.06 || 1;
  const a = lo - pad;
  const b = hi + pad;
  const w = 420;
  // Right always means better, so lower-is-better indicators run the axis the other way.
  const x = (value: number) => {
    const fraction = (value - a) / (b - a);
    return 8 + (row.lowerIsBetter ? 1 - fraction : fraction) * (w - 16);
  };
  const highlighted = ranked.find((item) => item.AreaID === highlightedAreaId);
  return (
    <svg viewBox={`0 0 ${w} 30`} className="h-auto w-full overflow-visible" role="img" aria-label={`${ranked.length} areas from ${formatValue(min, fmt)} to ${formatValue(max, fmt)}; ${areaName} ${formatValue(row.value, fmt)}`}>
      <line x1={8} x2={w - 8} y1={15} y2={15} stroke="#E5E7EB" />
      {median !== null && (
        <line x1={x(median)} x2={x(median)} y1={3} y2={27} stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="3 2" />
      )}
      <line x1={x(row.value)} x2={x(row.value)} y1={1} y2={29} stroke="#111827" strokeWidth={2.5} />
      {ranked.map((item) => (
        <circle
          key={item.AreaID}
          cx={x(item.Value!)}
          cy={15}
          r={item.AreaID === highlightedAreaId ? 5.5 : 3.5}
          fill={item.AreaID === highlightedAreaId ? '#003087' : '#005EB8'}
          fillOpacity={highlightedAreaId === null ? 0.5 : item.AreaID === highlightedAreaId ? 1 : 0.2}
          stroke="#fff"
          strokeWidth={1}
          className="cursor-pointer"
          onMouseEnter={(event) => onHover(item, event)}
          onMouseMove={(event) => onHover(item, event)}
          onMouseLeave={onLeave}
        />
      ))}
      {highlighted && (
        <circle cx={x(highlighted.Value!)} cy={15} r={5.5} fill="#003087" stroke="#fff" strokeWidth={1.5} pointerEvents="none" />
      )}
    </svg>
  );
}

export function WithinAreaLens({ rows, areaId, areaName, timePeriodId, active, defaultDepth, peersLabel }: WithinAreaLensProps) {
  const searchParams = useSearchParams();
  const [depthChoice, setDepthChoice] = useState<WithinDepth | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('spread');
  const [openId, setOpenId] = useState<number | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [pinnedAreaId, setPinnedAreaId] = useState<number | null>(null);

  const requests = useMemo(() => rows.map((row) => ({ metricId: row.metricId, timePeriodId: row.timePeriodId })), [rows]);
  // Fetch the child list first so a single-child area can default one level deeper.
  const probe = useWithinArea(areaId, timePeriodId, [], 'children', active);
  const depth: WithinDepth = depthChoice ?? (probe.children?.length === 1 ? 'grandchildren' : defaultDepth);
  const data = useWithinArea(areaId, timePeriodId, requests, depth, active && !!probe.children);

  const childLevel = probe.children?.[0] ? LEVEL_NAMES[probe.children[0].SystemLevelID] ?? 'area' : null;
  const grandchildLevel = data.areas[0] && depth === 'grandchildren' ? LEVEL_NAMES[data.areas[0].SystemLevelID] ?? null : null;
  const levelName = depth === 'children' ? childLevel : grandchildLevel ?? data.levelName;
  const canDescend = (probe.children?.length ?? 0) > 0 && probe.children![0].SystemLevelID !== 5;

  const strips = useMemo(() => {
    const result: StripRow[] = [];
    for (const row of rows) {
      const items = (data.byMetric.get(row.metricId) ?? []).filter((item) => item.Value !== null);
      if (items.length < 2) continue;
      const ranked = [...items]
        .sort((a, b) => (row.lowerIsBetter ? a.Value! - b.Value! : b.Value! - a.Value!))
        .map((item, index) => ({ ...item, rank: index + 1 }));
      const values = items.map((item) => item.Value!);
      const min = Math.min(...values);
      const max = Math.max(...values);
      result.push({ row, ranked, min, max, relativeSpread: (max - min) / Math.max(Math.abs(row.value), 0.01) });
    }
    return result.sort((a, b) => (
      sortBy === 'name'
        ? a.row.indicator.IndicatorShortName.localeCompare(b.row.indicator.IndicatorShortName)
        : b.relativeSpread - a.relativeSpread
    ));
  }, [rows, data.byMetric, sortBy]);

  const loading = data.total > 0 && data.loaded < data.total;
  const plural = (name: string | null) => (name ? `${name}s` : 'areas');
  const highlightedAreaId = hover?.areaId ?? pinnedAreaId;
  const pinnedName = pinnedAreaId !== null
    ? strips.flatMap((strip) => strip.ranked).find((item) => item.AreaID === pinnedAreaId)?.AreaName ?? null
    : null;

  const showHover = (strip: StripRow) => (item: RankedItem, event: MouseEvent) => {
    setHover({
      areaId: item.AreaID,
      name: cleanAreaName(item.AreaName),
      value: formatValue(item.Value, strip.row.indicator.FormatDisplayName),
      rank: item.rank,
      of: strip.ranked.length,
      denominator: item.Denominator,
      indicator: strip.row.indicator.IndicatorShortName.replace(/\s*\(CVDP?\d+[A-Z]*\)\s*$/i, ''),
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <>
      <LensHeader
        title={`Every ${levelName ?? 'area'} in ${areaName}, on each indicator`}
        description={<>Hover a dot for the name; click to keep it highlighted on every row. Right is always better. Widest spread first; open a row for the full ranking. {loading && <span className="inline-flex items-center gap-1 text-gray-400"><Loader2 className="h-3 w-3 animate-spin" aria-hidden />Loading {data.loaded} of {data.total}</span>}</>}
      >
        {canDescend && childLevel && (
          <Select value={depth} onValueChange={(value) => { setDepthChoice(value as WithinDepth); setOpenId(null); setPinnedAreaId(null); }}>
            <SelectTrigger className="h-8 w-auto min-w-40 gap-2 bg-white text-xs" aria-label="Level">
              <span className="text-gray-400">Level</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="children">{childLevel}</SelectItem>
              <SelectItem value="grandchildren">One level below {childLevel}</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="h-8 w-auto min-w-36 gap-2 bg-white text-xs" aria-label="Sort">
            <span className="text-gray-400">Sort</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spread">Widest spread</SelectItem>
            <SelectItem value="name">Indicator name</SelectItem>
          </SelectContent>
        </Select>
      </LensHeader>

      {pinnedName && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-blue-50/60 px-4 py-2 text-xs text-gray-700 sm:px-5">
          <span>Highlighting <b className="font-semibold">{cleanAreaName(pinnedName)}</b> on every row.</span>
          <span className="flex items-center gap-3">
            <Link href={buildUrl('/dashboard', new URLSearchParams({ area: String(pinnedAreaId) }))} className="font-medium text-nhs-blue hover:underline">Open as the area</Link>
            <button type="button" onClick={() => setPinnedAreaId(null)} className="font-medium text-gray-600 hover:underline">Clear</button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-gray-100 px-4 py-2 text-[11px] text-gray-500 sm:px-5">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-nhs-blue/50" aria-hidden />One {levelName ?? 'area'}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-0.5 bg-gray-900" aria-hidden />{areaName}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-0.5 border-l-2 border-dashed border-gray-400" aria-hidden />Median of {peersLabel} in England</span>
        <span className="ml-auto">worse ← → better</span>
      </div>
      <ColumnHeadings columns={COLUMNS} labels={['Indicator', `${levelName ?? 'Area'} results`, 'Range', '']} />

      {probe.children && probe.children.length === 0 ? (
        <EmptyLens>{areaName} has no areas below it in CVDPREVENT.</EmptyLens>
      ) : strips.length === 0 ? (
        <EmptyLens>{loading || data.isLoadingAreas || probe.isLoadingAreas ? 'Loading area results…' : 'No indicators match.'}</EmptyLens>
      ) : (
        <ul className="divide-y divide-gray-100">
          {strips.map((strip) => {
            const { row } = strip;
            const fmt = row.indicator.FormatDisplayName;
            const open = openId === row.indicator.IndicatorID;
            const worstFirst = [...strip.ranked].reverse();
            const span = Math.max(strip.max - strip.min, Number.EPSILON);
            return (
              <li key={row.indicator.IndicatorID} className={cn(open && 'bg-gray-50/70')}>
                <div className={cn('group grid gap-3 px-4 py-3 transition-colors hover:bg-nhs-pale-grey/40 sm:px-5 lg:items-center lg:gap-4', COLUMNS)}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : row.indicator.IndicatorID)}
                    className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue"
                  >
                    <IndicatorName row={row} extra={row.isRecordedPrevalence ? <span>recorded prevalence</span> : row.lowerIsBetter ? <span>lower is better</span> : undefined} />
                  </button>
                  <div onClick={() => hover && setPinnedAreaId((current) => (current === hover.areaId ? null : hover.areaId))}>
                    <MobileLabel>{levelName ?? 'Area'} results</MobileLabel>
                    <Strip
                      strip={strip}
                      areaName={areaName}
                      highlightedAreaId={highlightedAreaId}
                      onHover={showHover(strip)}
                      onLeave={() => setHover(null)}
                    />
                  </div>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : row.indicator.IndicatorID)}
                    className="flex items-baseline justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue lg:block"
                  >
                    <MobileLabel>Range</MobileLabel>
                    <span>
                      <span className="block text-sm font-semibold tabular-nums text-gray-900">{formatValue(strip.min, fmt)} – {formatValue(strip.max, fmt)}</span>
                      <span className="block text-[10px] tabular-nums text-gray-400">{strip.ranked.length} {plural(levelName)} · {areaName} {formatValue(row.value, fmt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? 'Hide ranking' : 'Show ranking'}
                    onClick={() => setOpenId(open ? null : row.indicator.IndicatorID)}
                    className="hidden rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue lg:block"
                  >
                    <ChevronDown className={cn('h-4 w-4 text-gray-300 transition-transform group-hover:text-nhs-blue', open && 'rotate-180')} aria-hidden />
                  </button>
                </div>
                {open && (
                  <div className="px-4 pb-4 sm:px-5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      All {strip.ranked.length} {plural(levelName)}, {row.lowerIsBetter ? 'highest' : 'lowest'} result first
                    </p>
                    <ol className="max-h-96 overflow-y-auto rounded-md border border-gray-200 bg-white">
                      {worstFirst.map((item) => (
                        <li
                          key={item.AreaID}
                          onMouseEnter={() => setPinnedAreaId(item.AreaID)}
                          className={cn(
                            'grid grid-cols-[2.5rem_minmax(10rem,1fr)_minmax(8rem,1.2fr)_5rem_8rem] items-center gap-3 border-b border-gray-100 px-3 py-1.5 text-sm last:border-b-0',
                            item.AreaID === highlightedAreaId && 'bg-blue-50',
                          )}
                        >
                          <span className="font-mono text-[11px] text-gray-400">{item.rank}</span>
                          <Link href={buildUrl('/dashboard', new URLSearchParams({ area: String(item.AreaID) }))} className="truncate text-gray-800 hover:text-nhs-blue hover:underline" title={item.AreaName}>
                            {cleanAreaName(item.AreaName)}
                          </Link>
                          <span className="block h-2 overflow-hidden rounded-sm bg-gray-100">
                            <span
                              className={cn('block h-full rounded-sm', item.rank > strip.ranked.length * 0.8 ? 'bg-amber-500' : 'bg-nhs-blue/60')}
                              style={{ width: `${Math.max(2, ((item.Value! - strip.min) / span) * 100)}%` }}
                            />
                          </span>
                          <b className="text-right tabular-nums">{formatValue(item.Value, fmt)}</b>
                          <span className="text-[11px] tabular-nums text-gray-400">{item.Denominator ? `${formatNumber(item.Denominator)} eligible` : ''}</span>
                        </li>
                      ))}
                    </ol>
                    <Link href={buildUrl(`/dashboard/${row.indicator.IndicatorID}`, searchParams)} className="mt-3 inline-block text-xs font-medium text-nhs-blue hover:underline">
                      Open the indicator page
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-semibold text-gray-900">{hover.name}</p>
          <p className="text-gray-600">{hover.indicator}</p>
          <p className="mt-1 tabular-nums text-gray-800">
            <b>{hover.value}</b> · rank {hover.rank} of {hover.of}
            {hover.denominator ? ` · ${formatNumber(hover.denominator)} eligible` : ''}
          </p>
        </div>
      )}
    </>
  );
}
