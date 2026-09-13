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
    <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="-mx-1 overflow-x-auto [scrollbar-width:thin] sm:overflow-visible">
        <div className="flex w-max min-w-full items-center gap-2 px-1 sm:w-auto sm:flex-wrap">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-500">Condition</span>
          <button
            onClick={() => onSelectCondition(null)}
            className={cn(
              'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
              selectedCondition === null
                ? 'border-nhs-blue bg-nhs-blue text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            All
          </button>
          {conditions.map((condition) => (
            <button
              key={condition}
              onClick={() => onSelectCondition(condition)}
              className={cn(
                'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                selectedCondition === condition
                  ? 'border-nhs-blue bg-nhs-blue text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              )}
              title={getConditionDisplayName(condition)}
            >
              {condition}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
