import { fetchApi } from './client';
import type { TimePeriod, TimePeriodResponse } from './types';

export async function getTimePeriods(): Promise<TimePeriod[]> {
  const response = await fetchApi<TimePeriodResponse>('/timePeriod', 'timePeriodList');
  return response.timePeriodList;
}

export function isStandardPeriod(period: TimePeriod): boolean {
  return period.TimePeriodName.startsWith('To ');
}

export function isOutcomePeriod(period: TimePeriod): boolean {
  return period.TimePeriodName.includes(' - ');
}

export function getLatestPeriod(periods: TimePeriod[], type: 'standard' | 'outcome'): TimePeriod | undefined {
  const filtered = periods.filter((p) => (type === 'standard' ? isStandardPeriod(p) : isOutcomePeriod(p)));

  return filtered.sort((a, b) => new Date(b.EndDate).getTime() - new Date(a.EndDate).getTime())[0];
}

export function sortPeriodsByDate(periods: TimePeriod[], direction: 'asc' | 'desc' = 'desc'): TimePeriod[] {
  return [...periods].sort((a, b) => {
    const diff = new Date(b.EndDate).getTime() - new Date(a.EndDate).getTime();
    return direction === 'desc' ? diff : -diff;
  });
}
