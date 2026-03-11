'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Area } from '@/lib/api/types';
import { SYSTEM_LEVELS } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';

interface AreaPickerProps {
  areas: Area[] | undefined;
  selectedArea: Area | null;
  onSelectArea: (area: Area) => void;
  levelId: number;
  placeholder?: string;
  isLoading?: boolean;
}

export function AreaPicker({ areas, selectedArea, onSelectArea, levelId, placeholder, isLoading }: AreaPickerProps) {
  const [search, setSearch] = useState('');

  const filteredAreas = areas?.filter((area) =>
    area.AreaName.toLowerCase().includes(search.toLowerCase())
  );

  const levelName = SYSTEM_LEVEL_NAMES[levelId] || 'Area';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{levelName}</label>
      <Select
        value={selectedArea?.AreaCode}
        onValueChange={(code) => {
          const area = areas?.find((a) => a.AreaCode === code);
          if (area) onSelectArea(area);
        }}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder={isLoading ? 'Loading...' : (placeholder || `Select ${levelName}`)} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredAreas?.map((area) => (
              <SelectItem key={area.AreaCode} value={area.AreaCode}>
                {area.AreaName
                  .replace(/^NHS /, '')
                  .replace(/ Integrated Care Board$/, '')
                  .replace(/ Primary Care Network$/, '')}
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
