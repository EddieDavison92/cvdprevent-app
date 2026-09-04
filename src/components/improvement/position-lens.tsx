'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { TrendSparkline } from '@/components/charts/trend-sparkline';
import { PeerRangeBar } from '@/components/dashboard/peer-range-bar';
import { NHS_COLORS } from '@/lib/constants/colors';
import { formatAbsDiff, formatDiff, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import type { LensRow } from '@/lib/utils/improvement-lenses';
import { cn } from '@/lib/utils';
import { cleanIndicatorName, ColumnHeadings, EmptyLens, IndicatorName, LensHeader, MobileLabel } from './lens-shared';

interface PositionLensProps {
  rows: LensRow[];
  areaName: string;
  systemLevelName: string;
  hasPeers: boolean;
}

type Quadrant = 'behind-slipping' | 'behind-improving' | 'ahead-slipping' | 'ahead-improving' | 'none';

const QUADRANT_ORDER: Quadrant[] = ['behind-slipping', 'behind-improving', 'ahead-slipping', 'ahead-improving', 'none'];
const QUADRANT_LABEL: Record<Quadrant, string> = {
  'behind-slipping': 'Behind and slipping',
  'behind-improving': 'Behind but improving',
  'ahead-slipping': 'Ahead but slipping',
  'ahead-improving': 'Ahead and improving',
  none: 'Not enough history',
};

function quadrantOf(row: LensRow): Quadrant {
  if (row.position === null || row.movement === null || row.isRecordedPrevalence) return 'none';
  const behind = row.position < 50;
  const slipping = row.movement < 0;
  return `${behind ? 'behind' : 'ahead'}-${slipping ? 'slipping' : 'improving'}` as Quadrant;
}

const W = 1000;
const H = 420;
const PAD = { left: 84, right: 28, top: 30, bottom: 70 };
/** Keeps points clear of the plot edges. */
const INSET = 14;
const Y_LIMIT = 1.5;

interface HoverState {
  row: LensRow;
  x: number;
  y: number;
}

function Badge({ number, className }: { number: number; className?: string }) {
  return (
    <span className={cn('inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-nhs-blue px-1 font-mono text-[11px] font-semibold text-white', className)}>
      {number}
    </span>
  );
}

function QuadrantChart({ rows, areaName, numbers }: { rows: LensRow[]; areaName: string; numbers: Map<number, number> }) {
  const searchParams = useSearchParams();
  const [hover, setHover] = useState<HoverState | null>(null);
  const points = rows.filter((row) => quadrantOf(row) !== 'none');
  const sx = (x: number) => PAD.left + INSET + (Math.min(100, x) / 100) * (W - PAD.left - PAD.right - INSET * 2);
  const sy = (y: number) => PAD.top + INSET + ((Y_LIMIT - Math.max(-Y_LIMIT, Math.min(Y_LIMIT, y))) / (Y_LIMIT * 2)) * (H - PAD.top - PAD.bottom - INSET * 2);
  if (points.length === 0) return null;
  const midX = sx(50);
  const midY = sy(0);
  const hoveredId = hover?.row.indicator.IndicatorID ?? null;
  // Draw numbered points last so they sit above the unnumbered cluster.
  const ordered = [...points].sort((a, b) => Number(numbers.has(a.indicator.IndicatorID)) - Number(numbers.has(b.indicator.IndicatorID)));

  const show = (row: LensRow) => (event: MouseEvent) => setHover({ row, x: event.clientX, y: event.clientY });

  return (
    <div className="px-2 pt-2 sm:px-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${areaName}: each indicator by position among peers and latest change`}>
        <rect x={PAD.left} y={PAD.top} width={midX - PAD.left} height={midY - PAD.top} fill="#F9FAFB" />
        <rect x={midX} y={PAD.top} width={W - PAD.right - midX} height={midY - PAD.top} fill="#F0F7F4" />
        <rect x={PAD.left} y={midY} width={midX - PAD.left} height={H - PAD.bottom - midY} fill="#FDF3EC" />
        <rect x={midX} y={midY} width={W - PAD.right - midX} height={H - PAD.bottom - midY} fill="#F9FAFB" />
        <text x={PAD.left} y={PAD.top - 10} className="fill-gray-500 text-[12px] font-semibold">Behind, improving</text>
        <text x={W - PAD.right} y={PAD.top - 10} textAnchor="end" className="fill-gray-500 text-[12px] font-semibold">Ahead, improving</text>
        <text x={PAD.left} y={H - PAD.bottom + 36} className="fill-gray-500 text-[12px] font-semibold">Behind, slipping</text>
        <text x={W - PAD.right} y={H - PAD.bottom + 36} textAnchor="end" className="fill-gray-500 text-[12px] font-semibold">Ahead, slipping</text>
        <line x1={midX} x2={midX} y1={PAD.top} y2={H - PAD.bottom} stroke="#D1D5DB" strokeWidth={1.5} />
        <line x1={PAD.left} x2={W - PAD.right} y1={midY} y2={midY} stroke="#D1D5DB" strokeWidth={1.5} />
        {[0, 25, 50, 75, 100].map((tick) => (
          <text key={tick} x={sx(tick)} y={H - PAD.bottom + 16} textAnchor="middle" className="fill-gray-400 text-[11px]">
            {tick === 0 ? 'worst' : tick === 100 ? 'best' : tick === 50 ? 'median' : `${tick}%`}
          </text>
        ))}
        {[-1, 0, 1].map((tick) => (
          <text key={tick} x={PAD.left - 8} y={sy(tick) + 4} textAnchor="end" className="fill-gray-400 text-[11px]">
            {tick === 0 ? 'no change' : tick > 0 ? '+1 spread' : '−1 spread'}
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - PAD.bottom + 36} textAnchor="middle" className="fill-gray-500 text-[11px]">Position among peers</text>
        <text transform={`translate(14 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="fill-gray-500 text-[11px]">Latest change (relative to peer spread)</text>
        {ordered.map((row) => {
          const id = row.indicator.IndicatorID;
          const cx = sx(row.position!);
          const cy = sy(row.movement!);
          const number = numbers.get(id);
          const isHovered = hoveredId === id;
          const dimmed = hoveredId !== null && !isHovered;
          return (
            <Link
              key={id}
              href={buildUrl(`/dashboard/${id}`, searchParams)}
              onMouseEnter={show(row)}
              onMouseMove={show(row)}
              onMouseLeave={() => setHover(null)}
              className="focus:outline-none"
              aria-label={cleanIndicatorName(row.indicator.IndicatorShortName)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={number ? 9 : isHovered ? 7 : 5}
                fill={number ? NHS_COLORS.blue : NHS_COLORS.midGrey}
                fillOpacity={dimmed ? 0.35 : 1}
                stroke="#fff"
                strokeWidth={1.5}
              />
              {number && (
                <text x={cx} y={cy + 3.5} textAnchor="middle" className="fill-white font-mono text-[10px] font-semibold" fillOpacity={dimmed ? 0.5 : 1} pointerEvents="none">
                  {number}
                </text>
              )}
            </Link>
          );
        })}
      </svg>
      <div className="mb-4 mt-1 flex flex-wrap gap-x-4 gap-y-1 px-2 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-nhs-blue" aria-hidden />Numbered: behind the median, listed in the same order below</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-nhs-mid-grey" aria-hidden />Ahead of the median</span>
        <span>Hover for detail, click to open the indicator</span>
      </div>
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-semibold text-gray-900">{cleanIndicatorName(hover.row.indicator.IndicatorShortName)}</p>
          <p className="mt-1 tabular-nums text-gray-700">
            <b>{formatValue(hover.row.value, hover.row.indicator.FormatDisplayName)}</b> · median {formatValue(hover.row.peer!.median, hover.row.indicator.FormatDisplayName)} · better than {hover.row.position}% of peers
          </p>
          <p className="tabular-nums text-gray-700">
            Latest change {hover.row.trend.change !== null ? formatDiff(hover.row.trend.change, hover.row.indicator.FormatDisplayName) : '—'} · {QUADRANT_LABEL[quadrantOf(hover.row)].toLowerCase()}
          </p>
        </div>
      )}
    </div>
  );
}

const COLUMNS = 'lg:grid-cols-[minmax(14rem,1.3fr)_6rem_11rem_12rem_10rem_1rem]';
const COLUMNS_NO_PEERS = 'lg:grid-cols-[minmax(14rem,1.3fr)_6rem_12rem_10rem_1rem]';

export function PositionLens({ rows, areaName, systemLevelName, hasPeers }: PositionLensProps) {
  const searchParams = useSearchParams();

  const { groups, numbers } = useMemo(() => {
    const numbers = new Map<number, number>();
    if (!hasPeers) {
      const sorted = [...rows].sort((a, b) => (a.favourableChange ?? Infinity) - (b.favourableChange ?? Infinity));
      return { groups: [{ quadrant: 'none' as Quadrant, label: 'Direction of travel, largest unfavourable change first', rows: sorted }], numbers };
    }
    const byQuadrant = new Map<Quadrant, LensRow[]>();
    for (const row of rows) {
      const quadrant = quadrantOf(row);
      byQuadrant.set(quadrant, [...(byQuadrant.get(quadrant) ?? []), row]);
    }
    let next = 1;
    const groups = QUADRANT_ORDER.flatMap((quadrant) => {
      const items = byQuadrant.get(quadrant);
      if (!items?.length) return [];
      items.sort((a, b) => (a.position ?? 101) - (b.position ?? 101) || (a.movement ?? 0) - (b.movement ?? 0));
      if (quadrant.startsWith('behind')) for (const row of items) numbers.set(row.indicator.IndicatorID, next++);
      return [{ quadrant, label: quadrant === 'none' ? 'Recorded prevalence and indicators without a position' : QUADRANT_LABEL[quadrant], rows: items }];
    });
    return { groups, numbers };
  }, [rows, hasPeers]);

  const columns = hasPeers ? COLUMNS : COLUMNS_NO_PEERS;

  const renderRow = (row: LensRow) => {
    const fmt = row.indicator.FormatDisplayName;
    const number = numbers.get(row.indicator.IndicatorID);
    const trendColor = row.trend.status === 'improving' ? NHS_COLORS.green : row.trend.status === 'deteriorating' ? NHS_COLORS.orange : NHS_COLORS.midGrey;
    const trendTone = row.trend.status === 'improving' ? 'text-nhs-green' : row.trend.status === 'deteriorating' ? 'text-nhs-orange' : 'text-gray-500';
    const trendLabel = row.trend.change === null
      ? 'Not enough history'
      : row.trend.status === 'stable'
        ? 'Stable'
        : row.trend.status === 'recording'
          ? `${row.trend.direction === 'up' ? 'Rising' : 'Falling'} ${formatDiff(row.trend.change, fmt)}`
          : `${row.trend.status === 'improving' ? 'Improving' : 'Deteriorating'} ${formatDiff(row.trend.change, fmt)}`;
    const peer = row.peer;
    let peerLabel = 'No peer data';
    let peerTone = 'text-gray-400';
    if (peer) {
      const gapText = formatAbsDiff(peer.gap, fmt);
      if (peer.status === 'recording') { peerLabel = `${gapText} ${peer.gap < 0 ? 'lower' : 'higher'} recording`; peerTone = 'text-gray-500'; }
      else if (peer.status === 'similar') { peerLabel = `Similar to peers · better than ${row.position}%`; peerTone = 'text-gray-500'; }
      else if (peer.status === 'favourable') { peerLabel = `${gapText} ahead · better than ${row.position}%`; peerTone = 'text-nhs-green'; }
      else { peerLabel = `${gapText} behind · better than ${row.position}%`; peerTone = 'text-nhs-red'; }
    }
    const gapLabel = row.gapDirection === null || row.gapNow === null
      ? null
      : `gap ${row.gapDirection}${row.gapChange !== null && row.gapDirection !== 'steady' ? ` ${formatAbsDiff(row.gapChange, fmt)}` : ''}`;

    return (
      <li key={row.indicator.IndicatorID}>
        <Link
          href={buildUrl(`/dashboard/${row.indicator.IndicatorID}`, searchParams)}
          className={cn('group grid gap-3 px-4 py-3 transition-colors hover:bg-nhs-pale-grey/40 focus-visible:bg-nhs-pale-grey/40 focus-visible:outline-none sm:px-5 lg:items-center lg:gap-4', columns)}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {number && <Badge number={number} />}
            <IndicatorName row={row} />
          </div>
          <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
            <MobileLabel>Our result</MobileLabel>
            <span>
              <span className="block text-sm font-semibold tabular-nums text-gray-900">{formatValue(row.value, fmt)}</span>
              {peer && <span className="block text-[10px] tabular-nums text-gray-400">median {formatValue(peer.median, fmt)}</span>}
            </span>
          </div>
          {hasPeers && (
            <div className="flex items-center justify-between gap-3">
              <MobileLabel>Peers</MobileLabel>
              <div className="w-full max-w-[11rem]">
                {peer && (
                  <PeerRangeBar value={row.value} min={peer.min} max={peer.max} median={peer.median} quintileBounds={peer.quintileBounds} areaLabel={areaName} status={peer.status} formatDisplayName={fmt} />
                )}
                <span className={cn('mt-0.5 block text-[11px] font-medium', peerTone)}>{peerLabel}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 lg:justify-start">
            <MobileLabel>Against the median</MobileLabel>
            <span className="inline-flex items-center gap-2">
              {row.series.filter((value) => value !== null).length >= 2 && (
                <TrendSparkline values={row.series} reference={hasPeers ? row.medianSeries : undefined} color={trendColor} className="shrink-0" />
              )}
              <span className={cn('text-xs font-medium', row.gapDirection === 'closing' ? 'text-nhs-green' : row.gapDirection === 'widening' ? 'text-nhs-orange' : 'text-gray-500')}>
                {gapLabel ?? (hasPeers ? 'No median history' : '')}
              </span>
            </span>
          </div>
          <div className={cn('flex items-center justify-between gap-2 text-xs font-medium lg:block', trendTone)}>
            <MobileLabel>Latest change</MobileLabel>
            <span>{trendLabel}</span>
          </div>
          <ArrowRight className="hidden h-4 w-4 text-gray-300 group-hover:text-nhs-blue lg:block" aria-hidden />
        </Link>
      </li>
    );
  };

  return (
    <>
      <LensHeader
        title={hasPeers ? `Every indicator by position among ${systemLevelName} and latest change` : 'Direction of travel since the last published period'}
        description={hasPeers
          ? 'Right means ahead of more peers. Up means moving the right way. Numbered points are behind the median; the list below uses the same numbers.'
          : 'England has no peers, so this shows movement only. Largest unfavourable change first.'}
      />
      {hasPeers && <QuadrantChart rows={rows} areaName={areaName} numbers={numbers} />}
      {rows.length === 0 ? <EmptyLens>No indicators match.</EmptyLens> : groups.map((group) => (
        <section key={group.quadrant} aria-label={group.label}>
          <div className="border-y border-gray-100 bg-gray-50/70 px-4 py-2 text-xs font-semibold text-gray-700 sm:px-5">
            {group.label} <span className="font-normal text-gray-400">{group.rows.length}</span>
          </div>
          <ColumnHeadings columns={columns} labels={hasPeers ? ['Indicator', '>Our result', 'Peers', 'Against the median', 'Latest change', ''] : ['Indicator', '>Our result', 'Trend', 'Latest change', '']} />
          <ul className="divide-y divide-gray-100">{group.rows.map(renderRow)}</ul>
        </section>
      ))}
    </>
  );
}
