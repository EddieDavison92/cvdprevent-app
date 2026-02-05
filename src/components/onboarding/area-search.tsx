'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { AreaCard } from './area-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Area } from '@/lib/api/types';
import { Search } from 'lucide-react';

interface AreaSearchProps {
  areas: Area[] | undefined;
  allAreas: Map<number, Area[]>;
  selectedArea: Area | null;
  onSelect: (area: Area) => void;
  isLoading?: boolean;
  levelId: number;
}

export function AreaSearch({ areas, allAreas, selectedArea, onSelect, isLoading, levelId }: AreaSearchProps) {
  const [search, setSearch] = useState('');

  // Build parent lookup
  const areaById = useMemo(() => {
    const map = new Map<number, Area>();
    for (const [, areaList] of allAreas) {
      for (const area of areaList) {
        map.set(area.AreaID, area);
      }
    }
    return map;
  }, [allAreas]);

  // Get parent name for an area
  const getParentName = (area: Area): string | undefined => {
    if (area.Parents && area.Parents.length > 0) {
      const parent = areaById.get(area.Parents[0]);
      if (parent) {
        return parent.AreaName
          .replace(/^NHS /, '')
          .replace(/ Integrated Care Board$/, '')
          .replace(/ Primary Care Network$/, '');
      }
    }
    return undefined;
  };

  // Filter areas by search
  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (!search.trim()) return areas;

    const searchLower = search.toLowerCase();
    return areas.filter((area) => {
      const nameMatch = area.AreaName.toLowerCase().includes(searchLower);
      const parentName = getParentName(area);
      const parentMatch = parentName?.toLowerCase().includes(searchLower);
      return nameMatch || parentMatch;
    });
  }, [areas, search, areaById]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search for your organisation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredAreas.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
          <p className="text-gray-500">
            {search ? 'No organisations found' : 'Select a level above to see organisations'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAreas.slice(0, 30).map((area) => (
            <AreaCard
              key={area.AreaCode}
              area={area}
              parentName={getParentName(area)}
              isSelected={selectedArea?.AreaCode === area.AreaCode}
              onClick={() => onSelect(area)}
            />
          ))}
        </div>
      )}

      {filteredAreas.length > 30 && (
        <p className="text-center text-sm text-gray-500">
          Showing 30 of {filteredAreas.length} results. Type to narrow down.
        </p>
      )}
    </div>
  );
}
