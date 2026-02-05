'use client';

import { TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickStatsProps {
  aboveCount: number;
  atCount: number;
  belowCount: number;
  baselineName?: string;
  isEngland?: boolean;
  improvingCount?: number;
  stableCount?: number;
  decliningCount?: number;
  isLoading?: boolean;
}

function QuickStatsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-white p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickStats({
  aboveCount, atCount, belowCount,
  baselineName = 'average',
  isEngland,
  improvingCount = 0, stableCount = 0, decliningCount = 0,
  isLoading,
}: QuickStatsProps) {
  if (isLoading) {
    return <QuickStatsSkeleton />;
  }

  if (isEngland) {
    return (
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{improvingCount}</div>
            <div className="text-xs text-gray-500">Improving</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
            <Minus className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{stableCount}</div>
            <div className="text-xs text-gray-500">Stable</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{decliningCount}</div>
            <div className="text-xs text-gray-500">Declining</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <TrendingUp className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{aboveCount}</div>
          <div className="text-xs text-gray-500">Above {baselineName}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
          <Minus className="h-5 w-5 text-yellow-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-600">{atCount}</div>
          <div className="text-xs text-gray-500">At {baselineName}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <TrendingDown className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{belowCount}</div>
          <div className="text-xs text-gray-500">Below {baselineName}</div>
        </div>
      </div>
    </div>
  );
}
