import { fetchApi, fetchApiNoCache } from './client';
import { SYSTEM_LEVELS, type TimePeriod, type TimePeriodResponse } from './types';

/**
 * A new standard period must still carry about 95% of the previous
 * England indicator count. Below that, the release is a partial load.
 */
const MIN_INDICATOR_COUNT_PERCENT = 95;
const RESOLVED_PERIOD_TTL_MS = 60 * 60 * 1000;

export interface StandardPeriodCoverage {
  timePeriodId: number;
  indicatorCount: number;
  personsCount: number;
}

export interface EnglandMetric {
  MetricCategoryTypeName?: string;
  MetricCategoryName?: string;
}

export interface EnglandIndicatorMetrics {
  MetricList?: EnglandMetric[];
}

export interface ResolvedLatestPeriods {
  standard?: TimePeriod;
  outcome?: TimePeriod;
}

type JsonFetch = <T>(endpoint: string, expectedKey?: string) => Promise<T>;

interface MetricListResponse {
  indicatorList?: EnglandIndicatorMetrics[];
}

let resolvedCache: { expiresAt: number; value: ResolvedLatestPeriods } | undefined;
let resolvedInFlight: Promise<ResolvedLatestPeriods> | undefined;

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

export function coverageFromMetricList(
  timePeriodId: number,
  indicators: readonly EnglandIndicatorMetrics[],
): StandardPeriodCoverage {
  let personsCount = 0;
  for (const indicator of indicators) {
    const hasPersons = indicator.MetricList?.some((metric) => (
      metric.MetricCategoryTypeName === 'Sex' && metric.MetricCategoryName === 'Persons'
    ));
    if (hasPersons) personsCount += 1;
  }

  return {
    timePeriodId,
    indicatorCount: indicators.length,
    personsCount,
  };
}

/** England coverage looks complete beside the previous standard period. */
export function isCompleteStandardLoad(
  candidate: StandardPeriodCoverage,
  previous: StandardPeriodCoverage,
): boolean {
  if (previous.indicatorCount <= 0 || candidate.indicatorCount <= 0) return false;

  const countHolds = candidate.indicatorCount * 100 >= previous.indicatorCount * MIN_INDICATOR_COUNT_PERCENT;
  // More than half. A partial load can list indicators that only have an SMI breakdown.
  const personsHold = candidate.personsCount * 2 > candidate.indicatorCount;
  return countHolds && personsHold;
}

/**
 * Newest period by end date.
 * Standard periods are eligible only when England coverage is supplied and
 * looks complete; otherwise the previous standard period is used.
 * Outcome periods ignore coverage and stay on the newest outcome period.
 */
export function getLatestPeriod(
  periods: TimePeriod[],
  type: 'standard' | 'outcome',
  coverage: readonly StandardPeriodCoverage[] = [],
): TimePeriod | undefined {
  const matches = type === 'standard' ? isStandardPeriod : isOutcomePeriod;
  const sorted = sortPeriodsByDate(periods.filter(matches));
  const newest = sorted[0];
  if (type === 'outcome' || !newest) return newest;

  const previous = sorted[1];
  if (!previous) return newest;

  const newestCoverage = coverage.find((item) => item.timePeriodId === newest.TimePeriodID);
  const previousCoverage = coverage.find((item) => item.timePeriodId === previous.TimePeriodID);
  if (!newestCoverage || !previousCoverage) return previous;
  return isCompleteStandardLoad(newestCoverage, previousCoverage) ? newest : previous;
}

export function sortPeriodsByDate(periods: TimePeriod[], direction: 'asc' | 'desc' = 'desc'): TimePeriod[] {
  return [...periods].sort((a, b) => {
    const diff = new Date(b.EndDate).getTime() - new Date(a.EndDate).getTime();
    return direction === 'desc' ? diff : -diff;
  });
}

async function readStandardCoverage(
  fetchJson: JsonFetch,
  timePeriodId: number,
): Promise<StandardPeriodCoverage | undefined> {
  try {
    const response = await fetchJson<MetricListResponse>(
      `/indicator/metricList?timePeriodID=${timePeriodId}&systemLevelID=${SYSTEM_LEVELS.ENGLAND}`,
      'indicatorList',
    );
    return coverageFromMetricList(timePeriodId, response.indicatorList ?? []);
  } catch (error) {
    console.error(`England indicator check failed for period ${timePeriodId}`, error);
    return undefined;
  }
}

async function resolveLatestPeriods(fetchJson: JsonFetch): Promise<ResolvedLatestPeriods> {
  const response = await fetchJson<TimePeriodResponse>('/timePeriod', 'timePeriodList');
  const periods = response.timePeriodList ?? [];
  const standardPeriods = sortPeriodsByDate(periods.filter(isStandardPeriod));
  const newest = standardPeriods[0];
  const previous = standardPeriods[1];
  const coverage: StandardPeriodCoverage[] = [];

  if (newest && previous) {
    const loaded = await Promise.all([
      readStandardCoverage(fetchJson, newest.TimePeriodID),
      readStandardCoverage(fetchJson, previous.TimePeriodID),
    ]);
    for (const item of loaded) {
      if (item) coverage.push(item);
    }
  }

  const standard = getLatestPeriod(periods, 'standard', coverage);
  const outcome = getLatestPeriod(periods, 'outcome');
  if (newest && standard && standard.TimePeriodID !== newest.TimePeriodID) {
    console.info(
      `Standard period ${newest.TimePeriodID} (${newest.TimePeriodName}) looks partial; using ${standard.TimePeriodName}`,
    );
  }

  return { standard, outcome };
}

/** Cached choice for pages and metadata. The England check stays on the server. */
export function getResolvedLatestPeriods(): Promise<ResolvedLatestPeriods> {
  if (resolvedCache && resolvedCache.expiresAt > Date.now()) return Promise.resolve(resolvedCache.value);

  if (!resolvedInFlight) {
    resolvedInFlight = resolveLatestPeriods(fetchApi)
      .then((value) => {
        resolvedCache = { expiresAt: Date.now() + RESOLVED_PERIOD_TTL_MS, value };
        return value;
      })
      .finally(() => {
        resolvedInFlight = undefined;
      });
  }

  return resolvedInFlight;
}

/** Uncached choice for the catalog monitor, using the same completeness rule. */
export function getFreshLatestPeriods(): Promise<ResolvedLatestPeriods> {
  return resolveLatestPeriods(fetchApiNoCache);
}
