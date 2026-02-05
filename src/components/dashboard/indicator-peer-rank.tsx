'use client';

import { useMemo } from 'react';
import { useSiblingData } from '@/lib/hooks/use-area-indicators';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Hash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndicatorPeerRankProps {
  timePeriodId: number | undefined;
  areaId: number | undefined;
  areaCode: string;
  metricId: number | undefined;
  lowerIsBetter: boolean;
  levelId?: number;
}

export function IndicatorPeerRank({
  timePeriodId,
  areaId,
  areaCode,
  metricId,
  lowerIsBetter,
  levelId,
}: IndicatorPeerRankProps) {
  const { data: siblingData, isLoading } = useSiblingData(timePeriodId, areaId, metricId);

  const rank = useMemo(() => {
    if (!siblingData?.Data?.length) return null;

    const sorted = siblingData.Data
      .filter(d => d.Value !== null)
      .sort((a, b) => {
        // For lowerIsBetter, lower value = better rank (rank 1)
        if (lowerIsBetter) return (a.Value ?? 0) - (b.Value ?? 0);
        // For normal, higher value = better rank (rank 1)
        return (b.Value ?? 0) - (a.Value ?? 0);
      });

    const position = sorted.findIndex(d => d.AreaCode === areaCode) + 1;
    if (position === 0) return null;

    const total = sorted.length;
    const levelName = levelId ? SYSTEM_LEVEL_NAMES[levelId] ?? 'peer' : 'peer';
    const quartile = position <= Math.ceil(total * 0.25)
      ? 'Top quartile'
      : position <= Math.ceil(total * 0.5)
        ? 'Upper half'
        : position <= Math.ceil(total * 0.75)
          ? 'Lower half'
          : 'Bottom quartile';

    const isGood = position <= Math.ceil(total * 0.5);

    return { position, total, levelName, quartile, isGood };
  }, [siblingData, areaCode, lowerIsBetter, levelId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading peer rank...
      </div>
    );
  }

  if (!rank) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Hash className="w-3.5 h-3.5 text-gray-400" />
      <span>
        Ranked <strong className={cn(rank.isGood ? 'text-green-700' : 'text-red-700')}>
          {rank.position}
        </strong> of {rank.total} {rank.levelName}s
        <span className="text-xs text-gray-400 ml-1">({rank.quartile})</span>
      </span>
    </div>
  );
}
