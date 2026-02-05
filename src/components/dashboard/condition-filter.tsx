'use client';

import { cn } from '@/lib/utils';
import { getConditionDisplayName } from '@/lib/utils/format';

interface ConditionFilterProps {
  conditions: string[];
  selectedCondition: string | null;
  onSelectCondition: (condition: string | null) => void;
}

export function ConditionFilter({
  conditions,
  selectedCondition,
  onSelectCondition,
}: ConditionFilterProps) {
  if (conditions.length <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCondition(null)}
        className={cn(
          'rounded-full px-3 py-1 text-sm font-medium transition-colors',
          selectedCondition === null
            ? 'bg-[#005EB8] text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        All ({conditions.length})
      </button>
      {conditions.map((condition) => (
        <button
          key={condition}
          onClick={() => onSelectCondition(condition)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            selectedCondition === condition
              ? 'bg-[#005EB8] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          title={getConditionDisplayName(condition)}
        >
          {condition}
        </button>
      ))}
    </div>
  );
}
