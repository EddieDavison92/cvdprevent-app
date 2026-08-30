'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { getAreaDisplayName } from '@/lib/api';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Search, Globe, Heart, BarChart3, List, ArrowRight, Clock3, Bot, CornerDownLeft } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
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

export default function LandingPage() {
  const router = useRouter();
  const { organisation, setOrganisation, isLoading: isLoadingOrg } = useOrganisation();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-redirect if already has organisation
  useEffect(() => {
    if (!isLoadingOrg && organisation) {
      router.push(`/dashboard?area=${organisation.AreaID}`);
    }
  }, [isLoadingOrg, organisation, router]);

  // Load time period for fetching areas
  const {
    data: latestPeriod,
    isLoading: isLoadingPeriod,
    isError: isPeriodError,
  } = useLatestTimePeriod('standard');

  // Load all areas across all levels
  const {
    areasByLevel,
    isLoading: isLoadingAreas,
    isError: isAreasError,
  } = useAllAreas(latestPeriod?.TimePeriodID);

  // Flatten all areas + build parent lookup
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

  // Filter areas by search
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

  const hasQuery = search.length >= 2;
  const showSlowApiHint = hasQuery && (isLoadingPeriod || isLoadingAreas);
  const showApiError = isPeriodError || isAreasError;
  const showResultsPanel = hasQuery;

  const handleSelectArea = (area: Area) => {
    setOrganisation(area);
    router.push(`/dashboard?area=${area.AreaID}`);
  };

  const handleViewEngland = () => {
    const englandArea: Area = {
      AreaCode: 'E92000001',
      AreaID: 1,
      AreaName: 'England',
      Parents: [],
      SystemLevelID: SYSTEM_LEVELS.ENGLAND,
      SystemLevelName: 'England',
    };
    setOrganisation(englandArea);
    router.push(`/dashboard?area=${englandArea.AreaID}`);
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

  // Loading while checking for existing org
  if (isLoadingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nhs-pale-grey/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nhs-blue border-t-transparent" />
      </div>
    );
  }

  // Don't render if redirecting
  if (organisation) return null;

  const listboxId = 'organisation-results';

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-nhs-pale-grey/30">
      {/* Background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,94,184,0.14),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] opacity-[0.35] [background-image:linear-gradient(rgba(0,48,135,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,48,135,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-14 sm:pt-20">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-nhs-blue shadow-lg shadow-nhs-blue/25 ring-4 ring-white">
            <Heart className="h-7 w-7 text-white" fill="currentColor" aria-hidden />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-nhs-dark-blue">
            CVD<span className="font-normal text-nhs-blue/80">PREVENT</span>
          </h1>
          <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
            Unofficial data explorer
          </p>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
            Find your organisation to explore cardiovascular disease prevention data across England.
          </p>
        </header>

        {/* Search */}
        <section aria-label="Organisation search">
          <div
            className={`overflow-hidden rounded-2xl border bg-white shadow-lg shadow-nhs-dark-blue/[0.06] transition-colors ${
              showResultsPanel ? 'border-nhs-blue/40' : 'border-gray-200'
            } focus-within:border-nhs-blue focus-within:ring-2 focus-within:ring-nhs-blue/20`}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-nhs-blue"
                aria-hidden
              />
              <label htmlFor="organisation-search" className="sr-only">
                Search for an organisation
              </label>
              <Input
                id="organisation-search"
                autoFocus
                autoComplete="off"
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
                className="h-14 rounded-none border-0 bg-transparent pl-12 pr-24 text-base shadow-none focus-visible:ring-0"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-gray-400 sm:flex">
                {visibleAreas.length > 0 ? (
                  <>
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans">↑↓</kbd>
                    <kbd className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans">
                      <CornerDownLeft className="h-3 w-3" aria-hidden />
                    </kbd>
                  </>
                ) : (
                  <span>{LEVEL_HINTS.join(' · ')}</span>
                )}
              </div>
            </div>

            {/* Results */}
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
                  <ul className="divide-y divide-gray-100" aria-busy>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : visibleAreas.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between px-4 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      <span>Organisations</span>
                      <span aria-live="polite">
                        {filteredAreas.length > MAX_RESULTS
                          ? `${MAX_RESULTS} of ${filteredAreas.length}`
                          : `${filteredAreas.length} result${filteredAreas.length === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <ul
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
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => handleSelectArea(area)}
                              onMouseEnter={() => setActiveIndex(i)}
                              className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                isActive ? 'bg-nhs-blue/[0.07]' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span
                                className={`inline-flex h-8 w-14 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                  isActive ? 'bg-nhs-blue text-white' : 'bg-nhs-blue/10 text-nhs-blue'
                                }`}
                              >
                                {SYSTEM_LEVEL_NAMES[area.SystemLevelID] ?? 'Area'}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-gray-900">
                                  {shortAreaName(area.AreaName)}
                                </span>
                                {parentName && (
                                  <span className="block truncate text-xs text-gray-500">{parentName}</span>
                                )}
                              </span>
                              <ArrowRight
                                className={`h-4 w-4 flex-shrink-0 text-nhs-blue transition-opacity ${
                                  isActive ? 'opacity-100' : 'opacity-0'
                                }`}
                                aria-hidden
                              />
                            </button>
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
                  <div className="px-4 py-8 text-center text-sm text-gray-500" role="status">
                    No organisations found for &ldquo;{search}&rdquo;
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {!showResultsPanel && (
            <p className="mt-3 text-center text-xs text-gray-500">
              Type at least 2 characters, or{' '}
              <button
                type="button"
                onClick={handleViewEngland}
                className="font-medium text-nhs-blue underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue/40"
              >
                view England as a whole
              </button>
              .
            </p>
          )}
        </section>

        {/* Quick links */}
        <nav aria-label="Explore" className="mt-12">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">Or explore</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'England overview',
                description: 'National trends and time series',
                icon: Globe,
                iconClass: 'bg-nhs-blue text-white',
                onClick: handleViewEngland,
              },
              {
                label: 'Indicators',
                description: 'Browse every CVD indicator',
                icon: List,
                iconClass: 'bg-nhs-bright-blue text-white',
                onClick: () => router.push('/indicators'),
              },
              {
                label: 'Benchmarks',
                description: 'Rank and compare areas',
                icon: BarChart3,
                iconClass: 'bg-nhs-dark-blue text-white',
                onClick: () => router.push('/benchmarks'),
              },
              {
                label: 'Ask with AI',
                description: 'Use the CVDPREVENT skill in ChatGPT or Claude',
                icon: Bot,
                iconClass: 'bg-nhs-blue/10 text-nhs-blue',
                onClick: () => router.push('/skills'),
              },
            ].map(({ label, description, icon: Icon, iconClass, onClick }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={onClick}
                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-nhs-blue/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue/50"
                >
                  <span className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-nhs-dark-blue">{label}</span>
                    <span className="block text-xs leading-4 text-gray-500">{description}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 flex-shrink-0 text-nhs-blue opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
