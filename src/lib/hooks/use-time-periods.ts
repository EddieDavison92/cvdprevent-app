'use client';

import { useQuery } from '@tanstack/react-query';
import { getTimePeriods, getLatestPeriod, sortPeriodsByDate } from '@/lib/api';

export function useTimePeriods() {
  return useQuery({
    queryKey: ['timePeriods'],
    queryFn: getTimePeriods,
    staleTime: Infinity, // Time periods rarely change
  });
}

export function useLatestTimePeriod(type: 'standard' | 'outcome') {
  const { data: periods, ...rest } = useTimePeriods();

  const latestPeriod = periods ? getLatestPeriod(periods, type) : undefined;

  return {
    data: latestPeriod,
    ...rest,
  };
}

export function useSortedTimePeriods(direction: 'asc' | 'desc' = 'desc') {
  const { data: periods, ...rest } = useTimePeriods();

  const sorted = periods ? sortPeriodsByDate(periods, direction) : undefined;

  return {
    data: sorted,
    ...rest,
  };
}
