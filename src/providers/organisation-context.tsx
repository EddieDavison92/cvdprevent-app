'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Area } from '@/lib/api/types';
import { fetchApi } from '@/lib/api/client';
import { getChildLevel } from '@/lib/constants/geography';
import { findSuccessorArea } from '@/lib/utils/geography';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { areasQueryOptions } from '@/lib/hooks/use-areas';

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

/** A saved area that no longer exists in the latest period, e.g. an ICB merged in April 2026. */
export interface RetiredAreaNotice {
  previous: Area;
  /** Area now covering it, or null if it could not be resolved. */
  replacement: Area | null;
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
  retiredArea: RetiredAreaNotice | null;
  dismissRetiredArea: () => void;
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

async function fetchAreaDetails(areaId: number, timePeriodId: number) {
  const response = await fetchApi<AreaDetailsResponse>(
    `/area/${areaId}/details?timePeriodID=${timePeriodId}`
  );
  return response.areaDetails;
}

// Fetch area details by ID
async function fetchAreaById(areaId: number, timePeriodId: number): Promise<Area | null> {
  try {
    const details = await fetchAreaDetails(areaId, timePeriodId);
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

/** Routes where `?area=` is an AreaID. Explorer and benchmarks use it for an area code. */
function ownsAreaParam(path: string): boolean {
  return path === '/' || path.startsWith('/dashboard');
}

function readAreaIdFromLocation(): number | null {
  if (typeof window === 'undefined' || !ownsAreaParam(window.location.pathname)) return null;
  const area = new URLSearchParams(window.location.search).get('area');
  const parsed = area ? parseInt(area, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [retiredArea, setRetiredArea] = useState<RetiredAreaNotice | null>(null);
  // Area confirmed to exist in the latest period; saved areas are hidden until checked
  const [validatedAreaId, setValidatedAreaId] = useState<number | null>(null);
  const [validatedBaselineId, setValidatedBaselineId] = useState<number | null>(null);

  const [organisation, setOrganisationState] = useState<Area | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [urlAreaId, setUrlAreaId] = useState<number | null>(null);
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);
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

  const {
    data: latestPeriod,
    errorUpdateCount: periodErrorCount,
    isFetching: isFetchingPeriod,
  } = useLatestTimePeriod('standard');
  // Sticky across refetches: isError clears while a retry is in flight
  const hasPeriodFailed = periodErrorCount > 0;
  const latestTimePeriodId = latestPeriod?.TimePeriodID;
  const hasUrlArea = urlAreaId !== null;

  const { data: urlArea, isLoading: isLoadingUrlArea } = useQuery({
    queryKey: ['areaDetails', urlAreaId, latestTimePeriodId],
    queryFn: () => fetchAreaById(urlAreaId!, latestTimePeriodId!),
    enabled: hasCheckedUrl && hasUrlArea && !!latestTimePeriodId,
    staleTime: Infinity,
  });

  // Read the area query after mount so useSearchParams does not force the
  // whole tree (including the homepage explainer) into a client-only fallback.
  // Initialize from URL param or localStorage post-mount: localStorage is
  // browser-only and a lazy initializer would mismatch the server HTML.
  /* eslint-disable react-hooks/set-state-in-effect -- SSR-safe hydration effects, see above */
  useEffect(() => {
    setUrlAreaId(readAreaIdFromLocation());
    setHasCheckedUrl(true);
  }, [pathname]);

  useEffect(() => {
    if (!hasCheckedUrl) return;

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
      const stored = readStoredOrganisation();
      if (stored) {
        setOrganisationState(stored.area);
        setLevelId(stored.levelId);
      }
      setIsLoading(false);
    } else if (hasUrlArea && !isLoadingUrlArea && !urlArea && !!latestTimePeriodId) {
      setIsLoading(false);
    } else if (hasUrlArea && !latestTimePeriodId && hasPeriodFailed && !isFetchingPeriod) {
      // Periods failed and no retry is running: the area can't be resolved, so let pages show their error state
      setIsLoading(false);
    }
  }, [urlArea, hasUrlArea, hasCheckedUrl, isLoadingUrlArea, latestTimePeriodId, hasPeriodFailed, isFetchingPeriod]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateUrlWithArea = useCallback((areaId: number) => {
    if (!ownsAreaParam(pathname)) return;
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    params.set('area', areaId.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname]);

  const setOrganisation = useCallback((area: Area) => {
    // Pickers list latest-period areas, so a chosen area needs no retirement check
    setValidatedAreaId(area.AreaID);
    setRetiredArea(null);
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
    setRetiredArea(null);

    if (ownsAreaParam(pathname)) {
      const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
      params.delete('area');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage failed, continue
    }
  }, [router, pathname]);

  const setBaseline = useCallback((area: Area) => {
    setValidatedBaselineId(area.AreaID);
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

  // Areas list for a level in the latest period, shared with useAreas' cache
  const fetchLatestAreas = useCallback(
    (levelId: number) => queryClient.fetchQuery(areasQueryOptions(latestTimePeriodId, levelId)),
    [queryClient, latestTimePeriodId],
  );

  // Replace a saved organisation that was retired (e.g. merged ICB) with its successor.
  useEffect(() => {
    if (!organisation || organisation.SystemLevelID === 1 || !latestTimePeriodId) return;
    if (validatedAreaId === organisation.AreaID) return;
    const retired = organisation;
    let cancelled = false;
    let isConfirmedRetired = false;

    // Clear the notice before replacing: setOrganisation/clearOrganisation reset it
    const retire = (replacement: Area | null) => {
      if (replacement) setOrganisation(replacement);
      else clearOrganisation();
      setRetiredArea({ previous: retired, replacement });
    };

    (async () => {
      const current = await fetchLatestAreas(retired.SystemLevelID);
      if (current.some((a) => a.AreaID === retired.AreaID)) {
        if (!cancelled) setValidatedAreaId(retired.AreaID);
        return;
      }
      isConfirmedRetired = true;

      let replacement: Area | null = null;
      const childLevelId = getChildLevel(retired.SystemLevelID);
      if (childLevelId) {
        const [details, children] = await Promise.all([
          fetchAreaDetails(retired.AreaID, latestTimePeriodId),
          fetchLatestAreas(childLevelId),
        ]);
        const childIds = details.ChildAreaList?.map((c) => c.AreaID) ?? [];
        replacement = findSuccessorArea(childIds, children, current);
      }
      if (!cancelled) retire(replacement);
    })().catch(() => {
      if (cancelled) return;
      // A confirmed-retired area has no current data, so drop it even if the successor lookup failed.
      // Otherwise keep it: data views show their own errors.
      if (isConfirmedRetired) retire(null);
      else setValidatedAreaId(retired.AreaID);
    });

    return () => {
      cancelled = true;
    };
  }, [organisation, validatedAreaId, latestTimePeriodId, fetchLatestAreas, setOrganisation, clearOrganisation]);

  // A retired baseline has no data in the latest period; fall back to England
  useEffect(() => {
    if (baseline.SystemLevelID === 1 || !latestTimePeriodId) return;
    let cancelled = false;
    fetchLatestAreas(baseline.SystemLevelID)
      .then((current) => {
        if (cancelled) return;
        if (current.some((a) => a.AreaID === baseline.AreaID)) setValidatedBaselineId(baseline.AreaID);
        else resetBaseline();
      })
      .catch(() => {
        if (!cancelled) setValidatedBaselineId(baseline.AreaID);
      });
    return () => {
      cancelled = true;
    };
  }, [baseline, latestTimePeriodId, fetchLatestAreas, resetBaseline]);

  const dismissRetiredArea = useCallback(() => setRetiredArea(null), []);

  // Hide a saved area until it is confirmed current, so a merged ICB's empty data never shows.
  // If periods have failed to load, release it so pages can show their API error state.
  const isValidating = !hasPeriodFailed
    && organisation !== null
    && organisation.SystemLevelID !== 1
    && validatedAreaId !== organisation.AreaID;
  const exposedOrganisation = isValidating ? null : organisation;
  const isValidatingBaseline = !hasPeriodFailed
    && baseline.SystemLevelID !== 1
    && validatedBaselineId !== baseline.AreaID;

  const isEngland = exposedOrganisation?.SystemLevelID === 1;
  const isBaselineEngland = baseline.AreaID === 1;

  return (
    <OrganisationContext.Provider
      value={{
        organisation: exposedOrganisation,
        levelId: isValidating ? null : levelId,
        setOrganisation,
        clearOrganisation,
        isEngland,
        isLoading: isLoading || isValidating || isValidatingBaseline,
        baseline,
        setBaseline,
        resetBaseline,
        isBaselineEngland,
        retiredArea,
        dismissRetiredArea,
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
