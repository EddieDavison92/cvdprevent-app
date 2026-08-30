'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { getAreaDisplayName } from '@/lib/api';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Building2, Check, Loader2, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { findKnownParentArea } from '@/lib/utils/geography';

interface AreaChangeDialogProps {
  compact?: boolean;
  className?: string;
}

const ENGLAND_AREA: Area = {
  AreaCode: 'E92000001',
  AreaID: 1,
  AreaName: 'England',
  Parents: [],
  SystemLevelID: SYSTEM_LEVELS.ENGLAND,
  SystemLevelName: 'England',
};

export function AreaChangeDialog({ compact = false, className }: AreaChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { organisation, setOrganisation } = useOrganisation();
  const { data: latestPeriod } = useLatestTimePeriod('standard');
  const { areasByLevel, isLoading } = useAllAreas(open ? latestPeriod?.TimePeriodID : undefined);

  const { allAreas, areaById } = useMemo(() => {
    const areas = [ENGLAND_AREA];
    const lookup = new Map<number, Area>([[ENGLAND_AREA.AreaID, ENGLAND_AREA]]);
    for (const [, areaList] of areasByLevel) {
      for (const area of areaList) {
        areas.push(area);
        lookup.set(area.AreaID, area);
      }
    }
    return { allAreas: areas, areaById: lookup };
  }, [areasByLevel]);

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (search.length < 2) return [];

    return allAreas.filter((area) => {
      const parent = findKnownParentArea(area, areaById);
      return area.AreaName.toLowerCase().includes(search)
        || parent?.AreaName.toLowerCase().includes(search);
    }).slice(0, 30);
  }, [allAreas, areaById, query]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  };

  const handleSelect = (area: Area) => {
    setOrganisation(area);
    setOpen(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 gap-2', className)}>
          <RefreshCw className="h-3.5 w-3.5" />
          {compact ? 'Change' : 'Change area'}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-2xl overflow-hidden p-0">
        <div className="border-b px-5 py-4">
          <DialogTitle>Change area</DialogTitle>
          <DialogDescription className="mt-1">
            Select another organisation without leaving this page.
          </DialogDescription>
        </div>

        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search regions, ICBs, Sub-ICBs or PCNs..."
            aria-label="Search areas"
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-[55vh] min-h-40 overflow-y-auto p-2">
          {isLoading && query.trim().length >= 2 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading areas…
            </div>
          ) : query.trim().length < 2 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="mb-3 h-7 w-7 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Search by organisation or parent area</p>
              <p className="mt-1 text-xs text-gray-500">Type at least two characters.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No areas found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((area) => {
                const parent = findKnownParentArea(area, areaById);
                const isCurrent = organisation?.AreaID === area.AreaID;
                return (
                  <li key={area.AreaID}>
                    <button
                      type="button"
                      onClick={() => handleSelect(area)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-nhs-pale-grey/50 focus-visible:bg-nhs-pale-grey/50 focus-visible:outline-none"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{getAreaDisplayName(area)}</p>
                        {parent && <p className="truncate text-xs text-gray-500">{getAreaDisplayName(parent)}</p>}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {SYSTEM_LEVEL_NAMES[area.SystemLevelID]}
                      </Badge>
                      {isCurrent && <Check className="h-4 w-4 shrink-0 text-nhs-blue" aria-label="Current area" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
