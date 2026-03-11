'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AreaCard } from '@/components/onboarding/area-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { getAreaDisplayName } from '@/lib/api';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { Search, Globe, Heart, BarChart3 } from 'lucide-react';
import { Footer } from '@/components/layout/footer';

export default function LandingPage() {
  const router = useRouter();
  const { organisation, setOrganisation, isLoading: isLoadingOrg } = useOrganisation();
  const [search, setSearch] = useState('');

  // Auto-redirect if already has organisation
  useEffect(() => {
    if (!isLoadingOrg && organisation) {
      router.push(`/dashboard?area=${organisation.AreaID}`);
    }
  }, [isLoadingOrg, organisation, router]);

  // Load time period for fetching areas
  const { data: latestPeriod } = useLatestTimePeriod('standard');

  // Load all areas across all levels
  const { areasByLevel, isLoading: isLoadingAreas } = useAllAreas(latestPeriod?.TimePeriodID);

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

  const getParentName = (area: Area): string | undefined => {
    if (area.Parents?.length > 0) {
      const parent = parentLookup.get(area.Parents[0]);
      return parent ? getAreaDisplayName(parent) : undefined;
    }
    return undefined;
  };

  // Filter areas by search
  const filteredAreas = useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    return allOrgs.filter((area) => {
      const name = area.AreaName.toLowerCase();
      const parentName = getParentName(area)?.toLowerCase() ?? '';
      return name.includes(q) || parentName.includes(q);
    });
  }, [allOrgs, search, parentLookup]);

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

  // Loading while checking for existing org
  if (isLoadingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8EDEE]/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#005EB8] border-t-transparent" />
      </div>
    );
  }

  // Don't render if redirecting
  if (organisation) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#E8EDEE]/30">
      <div className="mx-auto max-w-3xl flex-1 px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#005EB8]">
            <Heart className="h-7 w-7 text-white" fill="currentColor" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[#003087]">
            CVD<span className="font-normal opacity-70">PREVENT</span>
          </h1>
          <p className="text-sm text-gray-400 mb-3">Unofficial data explorer</p>
          <p className="text-gray-500">
            Search for your organisation to explore CVD prevention data
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {['ICB', 'Sub-ICB', 'PCN', 'Region'].map((level) => (
              <span
                key={level}
                className="inline-flex items-center rounded-full bg-[#005EB8]/10 px-3 py-1 text-xs font-medium text-[#005EB8]"
              >
                {level}
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            autoFocus
            placeholder="Search Regions, ICBs, Sub-ICBs, PCNs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-12 text-base rounded-xl border-gray-300 shadow-sm focus:border-[#005EB8] focus:ring-[#005EB8]"
          />
        </div>

        {/* Results */}
        {isLoadingAreas && search.length >= 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : filteredAreas.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredAreas.slice(0, 20).map((area) => (
                <AreaCard
                  key={area.AreaCode}
                  area={area}
                  parentName={getParentName(area)}
                  onClick={() => handleSelectArea(area)}
                />
              ))}
            </div>
            {filteredAreas.length > 20 && (
              <p className="mt-3 text-center text-sm text-gray-400">
                Showing 20 of {filteredAreas.length} results. Keep typing to narrow down.
              </p>
            )}
          </>
        ) : search.length >= 2 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-gray-400">
            No organisations found for &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div className="text-center text-sm text-gray-400 py-8">
            Type at least 2 characters to search
          </div>
        )}

        {/* Call-to-action cards */}
        <div className="mt-10 border-t pt-8 grid sm:grid-cols-2 gap-4">
          <button
            onClick={handleViewEngland}
            className="group flex items-start gap-4 rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-[#005EB8]/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#005EB8]/10 transition-colors group-hover:bg-[#005EB8]/20">
              <Globe className="h-5 w-5 text-[#005EB8]" />
            </div>
            <div>
              <p className="font-semibold text-[#003087]">England Overview</p>
              <p className="mt-0.5 text-sm text-gray-500">National trends across all indicators</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/benchmarks')}
            className="group flex items-start gap-4 rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-[#005EB8]/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#005EB8]/10 transition-colors group-hover:bg-[#005EB8]/20">
              <BarChart3 className="h-5 w-5 text-[#005EB8]" />
            </div>
            <div>
              <p className="font-semibold text-[#003087]">Benchmark Areas</p>
              <p className="mt-0.5 text-sm text-gray-500">Compare and rank Regions, ICBs, Sub-ICBs, and PCNs</p>
            </div>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
