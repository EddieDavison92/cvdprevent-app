'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { getChildAreas, getChildData } from '@/lib/api';
import type { SiblingDataItem } from '@/lib/api/types';

export type WithinDepth = 'children' | 'grandchildren';

export interface ChildArea {
  AreaID: number;
  AreaCode: string;
  AreaName: string;
  SystemLevelID: number;
}

export interface WithinAreaRequest {
  metricId: number;
  timePeriodId: number;
}

export interface WithinAreaResult {
  children: ChildArea[] | undefined;
  /** Areas plotted for the chosen depth. */
  areas: ChildArea[];
  levelName: string | null;
  /** Values per metric across the plotted areas. */
  byMetric: Map<number, SiblingDataItem[]>;
  loaded: number;
  total: number;
  isLoadingAreas: boolean;
}

/** Child (or grandchild) area values for every requested metric, fetched once per session. */
export function useWithinArea(
  areaId: number | undefined,
  timePeriodId: number | undefined,
  requests: WithinAreaRequest[],
  depth: WithinDepth,
  enabled: boolean,
): WithinAreaResult {
  const childrenQuery = useQuery({
    queryKey: ['childAreas', areaId, timePeriodId],
    queryFn: () => getChildAreas(areaId!, timePeriodId!),
    enabled: enabled && !!areaId && !!timePeriodId,
    staleTime: Infinity,
  });
  const children = childrenQuery.data;

  const grandchildQueries = useQueries({
    queries: (depth === 'grandchildren' && enabled ? children ?? [] : []).map((child) => ({
      queryKey: ['childAreas', child.AreaID, timePeriodId],
      queryFn: () => getChildAreas(child.AreaID, timePeriodId!),
      enabled: !!timePeriodId,
      staleTime: Infinity,
    })),
  });

  const parents = useMemo(() => {
    if (!children) return [];
    if (depth === 'children') return areaId ? [areaId] : [];
    return children.map((child) => child.AreaID);
  }, [children, depth, areaId]);

  const dataQueries = useQueries({
    queries: enabled
      ? requests.flatMap((request) => parents.map((parent) => ({
        queryKey: ['childData', request.timePeriodId, parent, request.metricId],
        queryFn: () => getChildData(request.timePeriodId, parent, request.metricId),
        staleTime: Infinity,
      })))
      : [],
  });

  const byMetric = useMemo(() => {
    const map = new Map<number, SiblingDataItem[]>();
    let index = 0;
    for (const request of requests) {
      const items: SiblingDataItem[] = [];
      for (let p = 0; p < parents.length; p += 1) {
        const query = dataQueries[index];
        index += 1;
        if (query?.data?.Data) items.push(...query.data.Data);
      }
      if (items.length) map.set(request.metricId, items);
    }
    return map;
    // dataQueries is a fresh array each render; depend on its data identity instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, parents, dataQueries.map((query) => query.data).join()]);

  const areas = useMemo(() => {
    if (!children) return [];
    if (depth === 'children') return children;
    return grandchildQueries.flatMap((query) => query.data ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, depth, grandchildQueries.map((query) => query.data).join()]);

  const levelName = useMemo(() => {
    const sample = byMetric.values().next().value?.[0];
    return sample?.SystemLevelName ?? null;
  }, [byMetric]);

  return {
    children,
    areas,
    levelName,
    byMetric,
    loaded: dataQueries.filter((query) => query.isSuccess).length,
    total: dataQueries.length,
    isLoadingAreas: childrenQuery.isLoading || grandchildQueries.some((query) => query.isLoading),
  };
}
