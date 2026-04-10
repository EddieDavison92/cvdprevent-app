import { fetchApi, fetchApiWithBrowserCache } from './client';
import type { Area, AreaResponse, SystemLevel, SystemLevelResponse } from './types';

const AREA_LIST_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export async function getSystemLevels(timePeriodId: number): Promise<SystemLevel[]> {
  const response = await fetchApi<SystemLevelResponse>(`/area/systemLevel?timePeriodID=${timePeriodId}`, 'systemLevels');
  return response.systemLevels;
}

export async function getAreas(timePeriodId: number, systemLevelId: number): Promise<Area[]> {
  const response = await fetchApiWithBrowserCache<AreaResponse>(
    `/area?timePeriodID=${timePeriodId}&systemLevelID=${systemLevelId}`,
    'areaList',
    {
      cacheKey: `cvdprevent:areas:${timePeriodId}:${systemLevelId}`,
      ttlMs: AREA_LIST_CACHE_TTL_MS,
    }
  );
  return response.areaList;
}

export function getPeerAreas(areaCode: string, areas: Area[]): Area[] {
  const area = areas.find((a) => a.AreaCode === areaCode);
  if (!area || area.Parents.length === 0) return [];
  const parentId = area.Parents[0];
  return areas.filter((a) => a.Parents.includes(parentId));
}

export function buildAreaHierarchy(areaCode: string, areasByLevel: Map<number, Area[]>): Area[] {
  const hierarchy: Area[] = [];

  // Build an AreaID -> Area map for lookups
  const areaById = new Map<number, Area>();
  for (const areas of areasByLevel.values()) {
    for (const area of areas) {
      areaById.set(area.AreaID, area);
    }
  }

  // Find the starting area
  let currentArea: Area | undefined;
  for (const areas of areasByLevel.values()) {
    currentArea = areas.find((a) => a.AreaCode === areaCode);
    if (currentArea) break;
  }

  // Walk up the hierarchy
  while (currentArea) {
    hierarchy.push(currentArea);
    if (currentArea.Parents.length === 0) break;
    currentArea = areaById.get(currentArea.Parents[0]);
  }

  return hierarchy;
}

export function getAreaDisplayName(area: Area): string {
  // Strip common prefixes for cleaner display
  return area.AreaName
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');
}
