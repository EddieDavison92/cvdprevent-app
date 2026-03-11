'use client';

import { cn } from '@/lib/utils';
import { SYSTEM_LEVELS } from '@/lib/api/types';
import { Building2, Building, Users, MapPin } from 'lucide-react';

const LEVELS = [
  { id: SYSTEM_LEVELS.REGION, label: 'Region', icon: MapPin, description: '7 NHS Regions' },
  { id: SYSTEM_LEVELS.ICB, label: 'ICB', icon: Building2, description: '42 Integrated Care Boards' },
  { id: SYSTEM_LEVELS.SUB_ICB, label: 'Sub-ICB', icon: Building, description: '~100 Sub-ICB locations' },
  { id: SYSTEM_LEVELS.PCN, label: 'PCN', icon: Users, description: '~1,250 Primary Care Networks' },
] as const;

interface LevelSelectorProps {
  value: number | null;
  onChange: (levelId: number) => void;
}

export function LevelSelector({ value, onChange }: LevelSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {LEVELS.map((level) => {
        const Icon = level.icon;
        const isSelected = value === level.id;

        return (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
              isSelected
                ? 'border-nhs-blue bg-nhs-blue/5 text-nhs-blue'
                : 'border-gray-200 bg-white hover:border-nhs-blue/50 hover:bg-gray-50'
            )}
          >
            <Icon className={cn('h-8 w-8', isSelected ? 'text-nhs-blue' : 'text-gray-400')} />
            <div className="text-center">
              <div className={cn('font-semibold', isSelected ? 'text-nhs-blue' : 'text-gray-900')}>
                {level.label}
              </div>
              <div className="text-xs text-gray-500">{level.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
