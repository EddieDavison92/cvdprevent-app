'use client';

import { useQuery } from '@tanstack/react-query';
import { getTimePeriods, sortPeriodsByDate, type ResolvedLatestPeriods, type TimePeriod } from '@/lib/api';

export function useTimePeriods() {
  return useQuery({
    queryKey: ['timePeriods'],
    queryFn: getTimePeriods,
    staleTime: Infinity, // Time periods rarely change
  });
}

async function fetchResolvedPeriods(): Promise<ResolvedLatestPeriods> {
  // The England completeness check stays on the server. A relative URL is only usable in the browser.
  if (typeof window === 'undefined') {
    const { getResolvedLatestPeriods } = await import('@/lib/api/time-periods');
    return getResolvedLatestPeriods();
  }

  const response = await fetch('/api/cvdprevent/latest-periods', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Latest periods are unavailable');

  const body = await response.json() as { standard: TimePeriod | null; outcome: TimePeriod | null };
  return {
    standard: body.standard ?? undefined,
    outcome: body.outcome ?? undefined,
  };
}

export function useLatestTimePeriod(type: 'standard' | 'outcome') {
  const { data, ...rest } = useQuery({
    queryKey: ['latestTimePeriods'],
    queryFn: fetchResolvedPeriods,
    staleTime: Infinity,
  });

  return {
    data: data?.[type],
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
