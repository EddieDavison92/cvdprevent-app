'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  favourableCount: number;
  atCount: number;
  unfavourableCount: number;
  baselineName?: string;
  isEngland?: boolean;
  improvingCount?: number;
  stableCount?: number;
  decliningCount?: number;
  isLoading?: boolean;
}

interface Segment {
  label: string;
  count: number;
  bar: string;
  text: string;
}

/** Compact strip: stacked bar of indicator counts with a legend. */
export function QuickStats({
  favourableCount, atCount, unfavourableCount,
  baselineName = 'average',
  isEngland,
  improvingCount = 0, stableCount = 0, decliningCount = 0,
  isLoading,
}: QuickStatsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  const segments: Segment[] = isEngland
    ? [
        { label: 'Improving', count: improvingCount, bar: 'bg-nhs-green', text: 'text-nhs-green' },
        { label: 'Stable', count: stableCount, bar: 'bg-gray-300', text: 'text-gray-600' },
        { label: 'Declining', count: decliningCount, bar: 'bg-nhs-red', text: 'text-nhs-red' },
      ]
    : [
        { label: `Favourable vs ${baselineName}`, count: favourableCount, bar: 'bg-nhs-green', text: 'text-nhs-green' },
        { label: `In line with ${baselineName}`, count: atCount, bar: 'bg-gray-300', text: 'text-gray-600' },
        { label: `Unfavourable vs ${baselineName}`, count: unfavourableCount, bar: 'bg-nhs-red', text: 'text-nhs-red' },
      ];

  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const summary = segments.map(s => `${s.count} ${s.label.toLowerCase()}`).join(', ');

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{total}</span> indicators
          {isEngland ? ' with a directional trend' : ' with a directional comparison'}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {segments.map(s => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm', s.bar)} aria-hidden />
              <span className={cn('font-semibold tabular-nums', s.text)}>{s.count}</span>
              <span className="text-gray-600">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={summary}
      >
        {total > 0 && segments.map(s => (
          <span key={s.label} className={s.bar} style={{ width: `${(s.count / total) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
