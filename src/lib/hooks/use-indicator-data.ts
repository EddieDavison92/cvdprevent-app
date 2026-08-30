'use client';

import { useQuery } from '@tanstack/react-query';
import { getIndicators, getIndicatorData, getPersonsData, getAreaData } from '@/lib/api';

export function useIndicators(timePeriodId: number | undefined, systemLevelId: number | undefined) {
  return useQuery({
    queryKey: ['indicators', timePeriodId, systemLevelId],
    queryFn: () => getIndicators(timePeriodId!, systemLevelId!),
    enabled: !!timePeriodId && !!systemLevelId,
    staleTime: Infinity, // Indicator list rarely changes
  });
}

export function useIndicatorData(
  indicatorId: number | undefined,
  timePeriodId: number | undefined,
  systemLevelId: number | undefined,
  personsOnly = false
) {
  return useQuery({
    queryKey: ['indicatorData', indicatorId, timePeriodId, systemLevelId, personsOnly],
    queryFn: () => getIndicatorData(indicatorId!, timePeriodId!, systemLevelId!, personsOnly),
    enabled: !!indicatorId && !!timePeriodId && !!systemLevelId,
    staleTime: 10 * 60 * 1000, // 10 minutes - data doesn't change frequently
    // Reuse previous data only within the same system level: rows from another
    // level would masquerade as the current level's comparison set
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[3] === systemLevelId && previousQuery?.queryKey[4] === personsOnly
        ? previousData
        : undefined,
  });
}

export function useIndicatorPersonsData(
  indicatorId: number | undefined,
  timePeriodId: number | undefined,
  systemLevelId: number | undefined
) {
  const { data, ...rest } = useIndicatorData(indicatorId, timePeriodId, systemLevelId);

  return {
    data: data ? getPersonsData(data) : undefined,
    ...rest,
  };
}

export function useAreaIndicatorData(
  indicatorId: number | undefined,
  timePeriodId: number | undefined,
  systemLevelId: number | undefined,
  areaCode: string | undefined
) {
  const { data, ...rest } = useIndicatorData(indicatorId, timePeriodId, systemLevelId);

  return {
    data: data && areaCode ? getAreaData(data, areaCode) : undefined,
    ...rest,
  };
}
