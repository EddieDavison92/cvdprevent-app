'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react';

interface ComparisonBadgeProps {
  orgValue: number | null | undefined;
  baselineValue: number | null | undefined;
  baselineName?: string;
  // Relative threshold as percentage to consider "similar" (default 5%)
  relativeThreshold?: number;
  size?: 'sm' | 'md';
}

export function ComparisonBadge({ 
  orgValue, 
  baselineValue, 
  baselineName = 'average',
  relativeThreshold = 0.25, 
  size = 'sm' 
}: ComparisonBadgeProps) {
  if (orgValue == null || baselineValue == null) return null;

  const diff = orgValue - baselineValue;

  // Use relative comparison: is the difference more than X% of the benchmark?
  // This handles both small values (0.8% vs 1.0%) and large values (50% vs 51%) correctly
  const relativeDiff = baselineValue !== 0 ? (Math.abs(diff) / baselineValue) * 100 : 0;
  const isSignificant = relativeDiff > relativeThreshold;

  const isAbove = isSignificant && diff > 0;
  const isBelow = isSignificant && diff < 0;

  const Icon = isAbove ? TrendingUp : isBelow ? TrendingDown : Minus;
  const label = isAbove ? 'Above' : isBelow ? 'Below' : 'At';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        isAbove && 'bg-green-100 text-green-700',
        isBelow && 'bg-red-100 text-red-700',
        !isAbove && !isBelow && 'bg-yellow-100 text-yellow-700'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {label} {baselineName}
    </div>
  );
}
