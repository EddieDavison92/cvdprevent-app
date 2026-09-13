'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Kbd,
  LevelBadge,
  SearchEmptyState,
  SearchField,
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
import { ENGLAND_AREA_ID, ENGLAND_DASHBOARD_HREF, SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Clock3, CornerDownLeft } from 'lucide-react';
import { ApiUnavailable } from '@/components/api-status-banner';
import { findKnownParentArea } from '@/lib/utils/geography';

const MAX_RESULTS = 20;

const LEVEL_HINTS = ['Region', 'ICB', 'Sub-ICB', 'PCN'];

function shortAreaName(name: string) {
  return name
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');
}

const ENGLAND_AREA: Area = {
  AreaCode: 'E92000001',
  AreaID: ENGLAND_AREA_ID,
  AreaName: 'England',
  Parents: [],
  SystemLevelID: SYSTEM_LEVELS.ENGLAND,
  SystemLevelName: 'England',
};

export function OrganisationSearch() {
  const router = useRouter();
  const { organisation, setOrganisation, isLoading: isLoadingOrg } = useOrganisation();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isLoadingOrg && organisation) {
      router.push(`/dashboard?area=${organisation.AreaID}`);
    }
  }, [isLoadingOrg, organisation, router]);

  const {
    data: latestPeriod,
    isLoading: isLoadingPeriod,
    isError: isPeriodError,
  } = useLatestTimePeriod('standard');

  const {
    areasByLevel,
    isLoading: isLoadingAreas,
    isError: isAreasError,
  } = useAllAreas(latestPeriod?.TimePeriodID);

  const { allOrgs, parentLookup } = useMemo(() => {
    const orgs: Area[] = [];
    const lookup = new Map<number, Area>();
    for (const [, areaList] of areasByLevel) {
      for (const area of areaList) {
        orgs.push(area);
        lookup.set(area.AreaID, area);
      }
    }
    return { allOrgs: orgs, parentLookup: lookup };
  }, [areasByLevel]);

  const getParentName = useCallback((area: Area): string | undefined => {
    if (area.Parents?.length > 0) {
      const parent = findKnownParentArea(area, parentLookup);
      return parent ? getAreaDisplayName(parent) : undefined;
    }
    return undefined;
  }, [parentLookup]);

  const filteredAreas = useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    return allOrgs.filter((area) => {
      const name = area.AreaName.toLowerCase();
      const parentName = getParentName(area)?.toLowerCase() ?? '';
      return name.includes(q) || parentName.includes(q);
    });
  }, [allOrgs, search, getParentName]);

  const visibleAreas = filteredAreas.slice(0, MAX_RESULTS);
  const resultsRef = useActiveResultScroll<HTMLUListElement>(visibleAreas[activeIndex]?.AreaID);

  const hasQuery = search.length >= 2;
  const showSlowApiHint = hasQuery && (isLoadingPeriod || isLoadingAreas);
  const showApiError = isPeriodError || isAreasError;
  const showResultsPanel = hasQuery;

  const handleSelectArea = (area: Area) => {
    setOrganisation(area);
    router.push(`/dashboard?area=${area.AreaID}`);
  };

  const handleChooseEngland = () => {
    setOrganisation(ENGLAND_AREA);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (visibleAreas.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleAreas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const area = visibleAreas[activeIndex];
      if (area) handleSelectArea(area);
    } else if (e.key === 'Escape') {
      setSearch('');
    }
  };

  const listboxId = 'organisation-results';

  return (
    <section aria-label="Organisation search">
      <div
        className={`overflow-hidden rounded-2xl border bg-white shadow-lg shadow-nhs-dark-blue/[0.06] transition-colors ${
          showResultsPanel ? 'border-nhs-blue/40' : 'border-gray-200'
        } focus-within:border-nhs-blue focus-within:ring-2 focus-within:ring-nhs-blue/20`}
      >
        <label htmlFor="organisation-search" className="sr-only">
          Search for an organisation
        </label>
        <SearchField
          id="organisation-search"
          size="lg"
          autoFocus
          role="combobox"
          aria-expanded={showResultsPanel}
          aria-controls={listboxId}
          aria-activedescendant={visibleAreas[activeIndex] ? `${listboxId}-${visibleAreas[activeIndex].AreaCode}` : undefined}
          placeholder="Search by region, ICB, sub-ICB or PCN name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          trailing={
            visibleAreas.length > 0 ? (
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

        {showResultsPanel && (
          <div className="border-t border-gray-100">
            {showApiError && <ApiUnavailable className="m-3" />}

            {!showApiError && showSlowApiHint && (
              <div className="flex items-start gap-3 border-b border-gray-100 bg-blue-50/60 px-4 py-2.5 text-xs text-blue-900">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <p>
                  Search can be slow while the CVDPREVENT API responds. Results will appear once the area lists finish loading.
                </p>
              </div>
            )}

            {isLoadingAreas ? (
              <SearchResultsSkeleton />
            ) : visibleAreas.length > 0 ? (
              <>
                <SearchGroupLabel>
                  <span>Organisations</span>
                  <span aria-live="polite">
                    {filteredAreas.length > MAX_RESULTS
                      ? `${MAX_RESULTS} of ${filteredAreas.length}`
                      : `${filteredAreas.length} result${filteredAreas.length === 1 ? '' : 's'}`}
                  </span>
                </SearchGroupLabel>
                <ul
                  ref={resultsRef}
                  id={listboxId}
                  role="listbox"
                  aria-label="Matching organisations"
                  className="max-h-[22rem] overflow-y-auto pb-1"
                >
                  {visibleAreas.map((area, i) => {
                    const parentName = getParentName(area);
                    const isActive = i === activeIndex;
                    return (
                      <li
                        key={area.AreaCode}
                        id={`${listboxId}-${area.AreaCode}`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <SearchResultRow
                          data-index={i}
                          tabIndex={-1}
                          active={isActive}
                          onClick={() => handleSelectArea(area)}
                          onMouseEnter={() => setActiveIndex(i)}
                          leading={
                            <LevelBadge active={isActive}>
                              {SYSTEM_LEVEL_NAMES[area.SystemLevelID] ?? 'Area'}
                            </LevelBadge>
                          }
                          title={shortAreaName(area.AreaName)}
                          subtitle={parentName}
                        />
                      </li>
                    );
                  })}
                </ul>
                {filteredAreas.length > MAX_RESULTS && (
                  <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-500">
                    Keep typing to narrow down the remaining {filteredAreas.length - MAX_RESULTS} results.
                  </p>
                )}
              </>
            ) : !showApiError ? (
              <SearchEmptyState>No organisations found for &ldquo;{search}&rdquo;</SearchEmptyState>
            ) : null}
          </div>
        )}
      </div>

      {!showResultsPanel && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Type at least 2 characters, or{' '}
          <Link
            href={ENGLAND_DASHBOARD_HREF}
            onClick={handleChooseEngland}
            className="font-medium text-nhs-blue underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue/40"
          >
            view England as a whole
          </Link>
          .
        </p>
      )}
    </section>
  );
}
