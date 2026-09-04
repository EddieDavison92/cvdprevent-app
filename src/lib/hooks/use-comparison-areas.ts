'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { buildAreaHierarchy, getAllIndicatorsForArea } from '@/lib/api';
import type { Area } from '@/lib/api/types';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { getPersonsData } from '@/lib/hooks/use-area-indicators';
import { SYSTEM_LEVEL_NAMES, SYSTEM_LEVEL_ORDER } from '@/lib/constants/geography';

export interface ComparisonArea {
  id: number;
  name: string;
  levelName: string;
  /** Persons value per indicator code. */
  values: Map<string, number>;
  isLoading: boolean;
}

const ENGLAND: Area = {
  AreaCode: 'E92000001',
  AreaID: 1,
  AreaName: 'England',
  Parents: [],
  SystemLevelID: 1,
  SystemLevelName: 'England',
};

function displayName(area: Area) {
  if (area.SystemLevelID === 1) return 'England';
  return area.AreaName
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '')
    .replace(/ - [A-Z0-9]+$/, '');
}

/** Every area above the organisation (England first), with its indicator values for the period. */
export function useComparisonAreas(
  organisation: Pick<Area, 'AreaID' | 'AreaCode' | 'SystemLevelID'> | null | undefined,
  timePeriodId: number | undefined,
): ComparisonArea[] {
  const { areasByLevel } = useAllAreas(organisation && organisation.SystemLevelID !== 1 ? timePeriodId : undefined);

  const ancestors = useMemo(() => {
    if (!organisation || organisation.SystemLevelID === 1) return [];
    const rank = (level: number) => {
      const index = SYSTEM_LEVEL_ORDER.indexOf(level as (typeof SYSTEM_LEVEL_ORDER)[number]);
      return index === -1 ? SYSTEM_LEVEL_ORDER.length : index;
    };
    const above = buildAreaHierarchy(organisation.AreaCode, areasByLevel)
      .filter((area) => area.AreaID !== organisation.AreaID && area.AreaID !== ENGLAND.AreaID)
      .sort((a, b) => rank(b.SystemLevelID) - rank(a.SystemLevelID));
    // Nearest parent first, England last.
    return [...above, ENGLAND];
    // areasByLevel is rebuilt each render; its contents change only when a level loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisation, [...areasByLevel.keys()].join()]);

  const queries = useQueries({
    queries: ancestors.map((area) => ({
      queryKey: ['areaIndicators', timePeriodId, area.AreaID],
      queryFn: () => getAllIndicatorsForArea(timePeriodId!, area.AreaID),
      enabled: !!timePeriodId,
      staleTime: 10 * 60 * 1000,
    })),
  });

  return useMemo(() => ancestors.map((area, index) => {
    const values = new Map<string, number>();
    for (const indicator of queries[index]?.data ?? []) {
      const value = getPersonsData(indicator)?.Data.Value;
      if (value !== null && value !== undefined) values.set(indicator.IndicatorCode, value);
    }
    return {
      id: area.AreaID,
      name: displayName(area),
      levelName: SYSTEM_LEVEL_NAMES[area.SystemLevelID] ?? '',
      values,
      isLoading: queries[index]?.isLoading ?? false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ancestors, queries.map((query) => query.data).join()]);
}
