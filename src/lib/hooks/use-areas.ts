'use client';

import { useQuery } from '@tanstack/react-query';
import { getAreas, getSystemLevels, getPeerAreas } from '@/lib/api';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';

export function useSystemLevels(timePeriodId: number | undefined) {
  return useQuery({
    queryKey: ['systemLevels', timePeriodId],
    queryFn: () => getSystemLevels(timePeriodId!),
    enabled: !!timePeriodId,
    staleTime: Infinity,
  });
}

export function useAreas(timePeriodId: number | undefined, systemLevelId: number | undefined) {
  return useQuery({
    queryKey: ['areas', timePeriodId, systemLevelId],
    queryFn: () => getAreas(timePeriodId!, systemLevelId!),
    enabled: !!timePeriodId && !!systemLevelId,
    staleTime: Infinity,
  });
}

export function useAllAreas(timePeriodId: number | undefined) {
  const regionsQuery = useAreas(timePeriodId, SYSTEM_LEVELS.REGION);
  const icbsQuery = useAreas(timePeriodId, SYSTEM_LEVELS.ICB);
  const subIcbsQuery = useAreas(timePeriodId, SYSTEM_LEVELS.SUB_ICB);
  const pcnsQuery = useAreas(timePeriodId, SYSTEM_LEVELS.PCN);

  const isLoading =
    regionsQuery.isLoading || icbsQuery.isLoading || subIcbsQuery.isLoading || pcnsQuery.isLoading;

  const areasByLevel = new Map<number, Area[]>();
  if (regionsQuery.data) areasByLevel.set(SYSTEM_LEVELS.REGION, regionsQuery.data);
  if (icbsQuery.data) areasByLevel.set(SYSTEM_LEVELS.ICB, icbsQuery.data);
  if (subIcbsQuery.data) areasByLevel.set(SYSTEM_LEVELS.SUB_ICB, subIcbsQuery.data);
  if (pcnsQuery.data) areasByLevel.set(SYSTEM_LEVELS.PCN, pcnsQuery.data);

  return {
    areasByLevel,
    regions: regionsQuery.data,
    icbs: icbsQuery.data,
    subIcbs: subIcbsQuery.data,
    pcns: pcnsQuery.data,
    isLoading,
  };
}

export function usePeerAreas(areaCode: string | undefined, areas: Area[] | undefined) {
  if (!areaCode || !areas) return [];
  return getPeerAreas(areaCode, areas);
}
