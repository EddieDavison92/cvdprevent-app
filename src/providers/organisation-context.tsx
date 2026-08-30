'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Area } from '@/lib/api/types';
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

function isValidArea(value: unknown): value is Area {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<Area>;
  return (
    typeof candidate.AreaID === 'number' &&
    Number.isFinite(candidate.AreaID) &&
    typeof candidate.AreaCode === 'string' &&
    typeof candidate.AreaName === 'string' &&
    Array.isArray(candidate.Parents) &&
    typeof candidate.SystemLevelID === 'number' &&
    typeof candidate.SystemLevelName === 'string'
  );
}

function readStoredOrganisation(): StoredOrganisation | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<StoredOrganisation>;
    if (!parsed || !isValidArea(parsed.area) || typeof parsed.levelId !== 'number') {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      area: parsed.area,
      levelId: parsed.levelId,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

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
  // Lazy read is hydration-safe: baseline-dependent UI only renders once the
  // organisation has loaded, which happens after mount
  const [baseline, setBaselineState] = useState<Area>(() => {
    if (typeof window === 'undefined') return ENGLAND_AREA;
    try {
      const stored = window.localStorage.getItem(BASELINE_STORAGE_KEY);
      if (!stored) return ENGLAND_AREA;
      const parsed: unknown = JSON.parse(stored);
      if (isValidArea(parsed)) return parsed;
    } catch {
      // Fall through to cleanup
    }
    try {
      window.localStorage.removeItem(BASELINE_STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
    return ENGLAND_AREA;
  });

  const { data: latestPeriod } = useLatestTimePeriod('standard');
  const latestTimePeriodId = latestPeriod?.TimePeriodID;

  // Parse URL area param synchronously on first render
  const areaParam = searchParams.get('area');
  const parsedUrlAreaId = areaParam ? parseInt(areaParam, 10) : null;
  const hasUrlArea = parsedUrlAreaId !== null && !isNaN(parsedUrlAreaId);

  // Fetch area from URL param if present
  const { data: urlArea, isLoading: isLoadingUrlArea } = useQuery({
    queryKey: ['areaDetails', parsedUrlAreaId, latestTimePeriodId],
    queryFn: () => fetchAreaById(parsedUrlAreaId!, latestTimePeriodId!),
    enabled: hasUrlArea && !!latestTimePeriodId,
    staleTime: Infinity,
  });

  // Initialize from URL param or localStorage. This must run post-mount:
  // localStorage is browser-only and a lazy initializer would make the first
  // client render differ from the server HTML (hydration mismatch), while the
  // URL branch syncs an async fetch result.
  /* eslint-disable react-hooks/set-state-in-effect -- SSR-safe hydration effect, see above */
  useEffect(() => {
    if (urlArea) {
      setOrganisationState(urlArea);
      setLevelId(urlArea.SystemLevelID);
      try {
        const toStore: StoredOrganisation = { area: urlArea, levelId: urlArea.SystemLevelID };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // Storage failed, continue with in-memory state
      }
      setIsLoading(false);
    } else if (!hasUrlArea) {
      // No URL param, try localStorage
      const stored = readStoredOrganisation();
      if (stored) {
        setOrganisationState(stored.area);
        setLevelId(stored.levelId);
      }
      setIsLoading(false);
    } else if (hasUrlArea && !isLoadingUrlArea && !urlArea && !!latestTimePeriodId) {
      // URL area fetch completed but returned null (invalid area ID)
      setIsLoading(false);
    }
  }, [urlArea, hasUrlArea, isLoadingUrlArea, latestTimePeriodId]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
