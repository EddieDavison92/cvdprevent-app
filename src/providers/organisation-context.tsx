'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Area, SYSTEM_LEVELS } from '@/lib/api/types';
import { fetchApi } from '@/lib/api/client';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';

const STORAGE_KEY = 'cvdprevent-organisation';
const BASELINE_STORAGE_KEY = 'cvdprevent-baseline';

// Default England area for baseline
const ENGLAND_AREA: Area = {
  AreaCode: 'E92000001',
  AreaID: 1,
  AreaName: 'England',
  Parents: [],
  SystemLevelID: 1,
  SystemLevelName: 'England',
};

interface StoredOrganisation {
  area: Area;
  levelId: number;
}

interface AreaDetailsResponse {
  areaDetails: Area & { ChildAreaList?: Area[]; ParentAreaList?: Area[] };
}

interface OrganisationContextValue {
  organisation: Area | null;
  levelId: number | null;
  setOrganisation: (area: Area) => void;
  clearOrganisation: () => void;
  isEngland: boolean;
  isLoading: boolean;
  // Baseline comparison
  baseline: Area;
  setBaseline: (area: Area) => void;
  resetBaseline: () => void;
  isBaselineEngland: boolean;
}

const OrganisationContext = createContext<OrganisationContextValue | null>(null);

// Fetch area details by ID
async function fetchAreaById(areaId: number, timePeriodId: number): Promise<Area | null> {
  try {
    const response = await fetchApi<AreaDetailsResponse>(
      `/area/${areaId}/details?timePeriodID=${timePeriodId}`
    );
    const details = response.areaDetails;
    return {
      AreaCode: details.AreaCode,
      AreaID: details.AreaID,
      AreaName: details.AreaName,
      Parents: details.ParentAreaList?.map((p) => p.AreaID) ?? [],
      SystemLevelID: details.SystemLevelID,
      SystemLevelName: details.SystemLevelName,
    };
  } catch {
    return null;
  }
}

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [organisation, setOrganisationState] = useState<Area | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [urlAreaId, setUrlAreaId] = useState<number | null>(null);
  const [baseline, setBaselineState] = useState<Area>(ENGLAND_AREA);

  const { data: latestPeriod } = useLatestTimePeriod('standard');
  const latestTimePeriodId = latestPeriod?.TimePeriodID;

  // Check URL for area parameter
  useEffect(() => {
    const areaParam = searchParams.get('area');
    if (areaParam) {
      const areaId = parseInt(areaParam, 10);
      if (!isNaN(areaId)) {
        setUrlAreaId(areaId);
      }
    }
  }, [searchParams]);

  // Fetch area from URL param if present
  const { data: urlArea, isLoading: isLoadingUrlArea } = useQuery({
    queryKey: ['areaDetails', urlAreaId, latestTimePeriodId],
    queryFn: () => fetchAreaById(urlAreaId!, latestTimePeriodId!),
    enabled: !!urlAreaId && !!latestTimePeriodId && !organisation,
    staleTime: Infinity,
  });

  // Initialize from URL param or localStorage
  useEffect(() => {
    if (urlArea) {
      // URL param takes precedence
      setOrganisationState(urlArea);
      setLevelId(urlArea.SystemLevelID);
      setIsLoading(false);
    } else if (!urlAreaId) {
      // No URL param, try localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: StoredOrganisation = JSON.parse(stored);
          setOrganisationState(parsed.area);
          setLevelId(parsed.levelId);
        }
      } catch {
        // Invalid stored data, ignore
      }
      setIsLoading(false);
    }
  }, [urlArea, urlAreaId]);

  // Initialize baseline from localStorage
  useEffect(() => {
    try {
      const storedBaseline = localStorage.getItem(BASELINE_STORAGE_KEY);
      if (storedBaseline) {
        const parsed: Area = JSON.parse(storedBaseline);
        setBaselineState(parsed);
      }
    } catch {
      // Invalid stored data, use default England
    }
  }, []);

  // Update loading state when URL area is being fetched
  useEffect(() => {
    if (urlAreaId && isLoadingUrlArea) {
      setIsLoading(true);
    }
  }, [urlAreaId, isLoadingUrlArea]);

  // Helper to update URL with area param
  const updateUrlWithArea = useCallback((areaId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('area', areaId.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const setOrganisation = useCallback((area: Area) => {
    setOrganisationState(area);
    setLevelId(area.SystemLevelID);

    // Reset baseline to England when changing organisation
    setBaselineState(ENGLAND_AREA);
    try {
      localStorage.removeItem(BASELINE_STORAGE_KEY);
    } catch {
      // Storage failed, continue
    }

    // Update URL
    updateUrlWithArea(area.AreaID);

    // Also save to localStorage as fallback
    try {
      const toStore: StoredOrganisation = { area, levelId: area.SystemLevelID };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Storage failed, continue without persistence
    }
  }, [updateUrlWithArea]);

  const clearOrganisation = useCallback(() => {
    setOrganisationState(null);
    setLevelId(null);
    setUrlAreaId(null);

    // Remove from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('area');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage failed, continue
    }
  }, [router, pathname, searchParams]);

  const setBaseline = useCallback((area: Area) => {
    setBaselineState(area);
    try {
      localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(area));
    } catch {
      // Storage failed, continue
    }
  }, []);

  const resetBaseline = useCallback(() => {
    setBaselineState(ENGLAND_AREA);
    try {
      localStorage.removeItem(BASELINE_STORAGE_KEY);
    } catch {
      // Storage failed, continue
    }
  }, []);

  const isEngland = organisation?.SystemLevelID === 1;
  const isBaselineEngland = baseline.AreaID === 1;

  return (
    <OrganisationContext.Provider
      value={{
        organisation,
        levelId,
        setOrganisation,
        clearOrganisation,
        isEngland,
        isLoading,
        baseline,
        setBaseline,
        resetBaseline,
        isBaselineEngland,
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
}

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useOrganisation must be used within OrganisationProvider');
  }
  return context;
}
