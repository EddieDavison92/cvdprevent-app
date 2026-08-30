'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Kbd,
  LevelBadge,
  SearchEmptyState,
  SearchField,
  SearchFooterHints,
  SearchGroupLabel,
  SearchResultRow,
  SearchResultsSkeleton,
  useActiveResultScroll,
} from '@/components/ui/search-list';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { getAreaDisplayName } from '@/lib/api';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Check, CornerDownLeft, RefreshCw } from 'lucide-react';
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

const LEVEL_HINTS = ['Region', 'ICB', 'Sub-ICB', 'PCN'];

export function AreaChangeDialog({ compact = false, className }: AreaChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
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
    if (!nextOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  };

  const handleSelect = (area: Area) => {
    setOrganisation(area);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const area = results[activeIndex];
      if (area) handleSelect(area);
    }
  };

  const hasQuery = query.trim().length >= 2;
  const listboxId = 'area-change-results';
  const resultsRef = useActiveResultScroll<HTMLDivElement>(results[activeIndex]?.AreaID);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 gap-2', className)}>
          <RefreshCw className="h-3.5 w-3.5" />
          {compact ? 'Change' : 'Change area'}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-2xl gap-0 overflow-hidden rounded-2xl border-gray-200 p-0">
        <div className="border-b border-gray-100 px-4 py-3 pr-12">
          <DialogTitle className="text-base font-semibold text-nhs-dark-blue">Change area</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Select another organisation without leaving this page.
          </DialogDescription>
        </div>

        <div className="border-b border-gray-100">
          <SearchField
            autoFocus
            role="combobox"
            aria-expanded={hasQuery}
            aria-controls={listboxId}
            aria-activedescendant={results[activeIndex] ? `${listboxId}-${results[activeIndex].AreaID}` : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by region, ICB, sub-ICB or PCN name…"
            aria-label="Search areas"
            trailing={
              results.length > 0 ? (
                <>
                  <Kbd>↑↓</Kbd>
                  <Kbd>
                    <CornerDownLeft className="h-3 w-3" aria-hidden />
                  </Kbd>
                </>
              ) : (
                <span className="text-[11px] text-gray-400">{LEVEL_HINTS.join(' · ')}</span>
              )
            }
          />
        </div>

        <div ref={resultsRef} className="max-h-[55vh] min-h-40 overflow-y-auto pb-1">
          {isLoading && hasQuery ? (
            <SearchResultsSkeleton />
          ) : !hasQuery ? (
            <SearchEmptyState>
              <p className="font-medium text-gray-700">Search by organisation or parent area</p>
              <p className="mt-1 text-xs">Type at least 2 characters.</p>
            </SearchEmptyState>
          ) : results.length === 0 ? (
            <SearchEmptyState>No areas found for &ldquo;{query}&rdquo;</SearchEmptyState>
          ) : (
            <>
              <SearchGroupLabel>
                <span>Organisations</span>
                <span aria-live="polite">
                  {results.length} result{results.length === 1 ? '' : 's'}
                </span>
              </SearchGroupLabel>
              <ul id={listboxId} role="listbox" aria-label="Matching areas">
                {results.map((area, i) => {
                  const parent = findKnownParentArea(area, areaById);
                  const isCurrent = organisation?.AreaID === area.AreaID;
                  const isActive = i === activeIndex;
                  return (
                    <li
                      key={area.AreaID}
                      id={`${listboxId}-${area.AreaID}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <SearchResultRow
                        data-index={i}
                        tabIndex={-1}
                        active={isActive}
                        onClick={() => handleSelect(area)}
                        onMouseEnter={() => setActiveIndex(i)}
                        leading={
                          <LevelBadge active={isActive}>{SYSTEM_LEVEL_NAMES[area.SystemLevelID] ?? 'Area'}</LevelBadge>
                        }
                        title={getAreaDisplayName(area)}
                        subtitle={parent ? getAreaDisplayName(parent) : undefined}
                        trailing={
                          isCurrent ? (
                            <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-nhs-blue">
                              <Check className="h-4 w-4" aria-hidden />
                              <span className="hidden sm:inline">Current</span>
                              <span className="sr-only">Current area</span>
                            </span>
                          ) : undefined
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <SearchFooterHints
          hints={[
            { keys: '↑↓', label: 'navigate' },
            { keys: <CornerDownLeft className="h-3 w-3" aria-hidden />, label: 'select' },
            { keys: 'esc', label: 'close' },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
