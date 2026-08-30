'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PerformanceStatus } from '@/lib/utils/quality-improvement';
import { formatValue } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

export const STATUS_META: Record<PerformanceStatus, { label: string; dot: string; text: string; stripe: string; bg: string }> = {
  unfavourable: { label: 'Behind peers', dot: 'bg-nhs-red', text: 'text-nhs-red', stripe: 'border-l-nhs-red', bg: 'bg-red-50' },
  similar: { label: 'Similar to peers', dot: 'bg-gray-400', text: 'text-gray-500', stripe: 'border-l-gray-300', bg: 'bg-gray-50' },
  favourable: { label: 'Ahead of peers', dot: 'bg-nhs-green', text: 'text-nhs-green', stripe: 'border-l-nhs-green', bg: 'bg-green-50' },
  recording: { label: 'Recorded prevalence', dot: 'bg-nhs-blue', text: 'text-nhs-blue', stripe: 'border-l-nhs-blue', bg: 'bg-blue-50' },
  unavailable: { label: 'No comparison', dot: 'bg-gray-300', text: 'text-gray-400', stripe: 'border-l-gray-200', bg: 'bg-gray-50' },
};

interface PeerRangeBarProps {
  value: number;
  min: number | null;
  max: number | null;
  median: number | null;
  quintileBounds?: Array<number | null>;
  /** Name shown for the dot in the tooltip. */
  areaLabel?: string;
  status: PerformanceStatus;
  formatDisplayName: string;
  className?: string;
}

/** Area value plotted on the min–max peer range, with quintile ticks and a median marker. */
export function PeerRangeBar({ value, min, max, median, quintileBounds = [], areaLabel = 'This area', status, formatDisplayName, className }: PeerRangeBarProps) {
  if (min === null || max === null || median === null || max <= min) return null;
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;
  const fmt = (v: number) => formatValue(v, formatDisplayName);
  const label = `${areaLabel} ${fmt(value)} on a peer range of ${fmt(min)} to ${fmt(max)}, median ${fmt(median)}`;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('relative h-4 w-full', className)} role="img" aria-label={label}>
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
            {quintileBounds.map((q, i) => q !== null && (
              <span key={i} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-white" style={{ left: pct(q) }} />
            ))}
            <span className="absolute top-0 h-4 w-0.5 -translate-x-1/2 bg-gray-700" style={{ left: pct(median) }} />
            <span
              className={cn('absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow', STATUS_META[status].dot)}
              style={{ left: pct(value) }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-0.5 tabular-nums">
            <p className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', STATUS_META[status].dot)} aria-hidden />
              {areaLabel}: <span className="font-semibold">{fmt(value)}</span>
            </p>
            <p>Peer median: {fmt(median)}</p>
            <p>Peer range: {fmt(min)} – {fmt(max)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
