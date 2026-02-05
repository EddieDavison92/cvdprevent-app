'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllIndicatorsForArea, getSiblingData, getChildAreas, getChildData } from '@/lib/api';
import type { IndicatorWithData } from '@/lib/api/types';

// Hook to get ALL indicators with time series for a single area
// This is the most efficient way to fetch data - ONE call gets everything
export function useAreaIndicators(timePeriodId: number | undefined, areaId: number | undefined) {
  return useQuery({
    queryKey: ['areaIndicators', timePeriodId, areaId],
    queryFn: () => getAllIndicatorsForArea(timePeriodId!, areaId!),
    enabled: !!timePeriodId && !!areaId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Helper to find an indicator by ID from the cached data
export function findIndicatorById(
  indicators: IndicatorWithData[] | undefined,
  indicatorId: number
): IndicatorWithData | undefined {
  return indicators?.find((ind) => ind.IndicatorID === indicatorId);
}

// Helper to get Persons category from an indicator
export function getPersonsData(indicator: IndicatorWithData) {
  return indicator.Categories.find(
    (c) => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
}

// Helper to get all demographic categories from an indicator
export function getDemographicCategories(indicator: IndicatorWithData, categoryType: string) {
  return indicator.Categories.filter((c) => c.MetricCategoryTypeName === categoryType);
}

// Hook to get sibling/peer data for comparison
export function useSiblingData(
  timePeriodId: number | undefined,
  areaId: number | undefined,
  metricId: number | undefined
) {
  return useQuery({
    queryKey: ['siblingData', timePeriodId, areaId, metricId],
    queryFn: () => getSiblingData(timePeriodId!, areaId!, metricId!),
    enabled: !!timePeriodId && !!areaId && !!metricId,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook to get child areas
export function useChildAreas(
  areaId: number | undefined,
  timePeriodId: number | undefined
) {
  return useQuery({
    queryKey: ['childAreas', areaId, timePeriodId],
    queryFn: () => getChildAreas(areaId!, timePeriodId!),
    enabled: !!areaId && !!timePeriodId,
    staleTime: Infinity,
  });
}

// Hook to get child data using the dedicated childData endpoint
export function useChildData(
  timePeriodId: number | undefined,
  areaId: number | undefined,
  metricId: number | undefined
) {
  return useQuery({
    queryKey: ['childData', timePeriodId, areaId, metricId],
    queryFn: () => getChildData(timePeriodId!, areaId!, metricId!),
    enabled: !!timePeriodId && !!areaId && !!metricId,
    staleTime: 10 * 60 * 1000,
  });
}
