'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Check } from 'lucide-react';

interface AreaCardProps {
  area: Area;
  parentName?: string;
  isSelected?: boolean;
  onClick: () => void;
}

export function AreaCard({ area, parentName, isSelected, onClick }: AreaCardProps) {
  const displayName = area.AreaName
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex w-full flex-col gap-1 rounded-lg border-2 p-4 text-left transition-all',
        isSelected
          ? 'border-nhs-blue bg-nhs-blue/5'
          : 'border-gray-200 bg-white hover:border-nhs-blue/50 hover:bg-gray-50'
      )}
    >
      {isSelected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-nhs-blue">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
      <div className="flex items-center gap-2 pr-8">
        <span className={cn('font-semibold', isSelected ? 'text-nhs-blue' : 'text-gray-900')}>
          {displayName}
        </span>
        <Badge variant="outline" className="shrink-0 text-[10px] font-medium">
          {SYSTEM_LEVEL_NAMES[area.SystemLevelID]}
        </Badge>
      </div>
      {parentName && (
        <div className="text-sm text-gray-500">
          {parentName}
        </div>
      )}
    </button>
  );
}
