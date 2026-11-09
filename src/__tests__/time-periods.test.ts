import { describe, expect, it } from 'vitest';
import {
  coverageFromMetricList,
  getLatestPeriod,
  type EnglandIndicatorMetrics,
  type StandardPeriodCoverage,
} from '@/lib/api/time-periods';
import type { TimePeriod } from '@/lib/api/types';

function period(id: number, name: string, endDate: string): TimePeriod {
  const outcome = name.includes(' - ');
  return {
    TimePeriodID: id,
    TimePeriodName: name,
    StartDate: '2025-04-01T00:00:00.000Z',
    EndDate: endDate,
    IndicatorTypeID: outcome ? 2 : 1,
    IndicatorTypeName: outcome ? 'Outcomes' : 'Standard',
  };
}

const periods = [
  period(33, 'To March 2026', '2026-03-31T00:00:00.000Z'),
  period(34, 'To June 2026', '2026-06-30T00:00:00.000Z'),
  period(32, 'Jan 2025 - Dec 2025', '2026-03-31T00:00:00.000Z'),
  period(35, 'Apr 2025 - Mar 2026', '2026-06-30T00:00:00.000Z'),
];

const personsMetric: EnglandIndicatorMetrics = {
  MetricList: [{ MetricCategoryTypeName: 'Sex', MetricCategoryName: 'Persons' }],
};
const smiOnlyMetric: EnglandIndicatorMetrics = {
  MetricList: [{ MetricCategoryTypeName: 'Mental Health', MetricCategoryName: 'People with SMI' }],
};

function repeat(metric: EnglandIndicatorMetrics, count: number) {
  return Array.from({ length: count }, () => metric);
}

const complete: StandardPeriodCoverage = { timePeriodId: 34, indicatorCount: 47, personsCount: 47 };
const previous: StandardPeriodCoverage = { timePeriodId: 33, indicatorCount: 47, personsCount: 47 };
const partial: StandardPeriodCoverage = { timePeriodId: 34, indicatorCount: 33, personsCount: 7 };

describe('standard period completeness', () => {
  it('keeps the newest standard period when England coverage is complete', () => {
    expect(getLatestPeriod(periods, 'standard', [complete, previous])?.TimePeriodID).toBe(34);
  });

  it('falls back when the newest standard period is a partial load', () => {
    const partialList = [...repeat(personsMetric, 7), ...repeat(smiOnlyMetric, 26)];
    expect(coverageFromMetricList(34, partialList)).toEqual(partial);
    expect(getLatestPeriod(periods, 'standard', [partial, previous])?.TimePeriodID).toBe(33);
  });

  it('falls back when the indicator count holds but Persons values do not', () => {
    const missingPersons: StandardPeriodCoverage = { timePeriodId: 34, indicatorCount: 47, personsCount: 7 };
    expect(getLatestPeriod(periods, 'standard', [missingPersons, previous])?.TimePeriodID).toBe(33);
  });

  it('accepts about 95% of the previous count when most indicators have Persons values', () => {
    const justEnough: StandardPeriodCoverage = { timePeriodId: 34, indicatorCount: 95, personsCount: 48 };
    const prior: StandardPeriodCoverage = { timePeriodId: 33, indicatorCount: 100, personsCount: 100 };
    expect(getLatestPeriod(periods, 'standard', [justEnough, prior])?.TimePeriodID).toBe(34);
  });

  it('rejects a count below about 95%', () => {
    const tooFew: StandardPeriodCoverage = { timePeriodId: 34, indicatorCount: 94, personsCount: 94 };
    const prior: StandardPeriodCoverage = { timePeriodId: 33, indicatorCount: 100, personsCount: 100 };
    expect(getLatestPeriod(periods, 'standard', [tooFew, prior])?.TimePeriodID).toBe(33);
  });

  it('does not use an unverified newest standard period', () => {
    expect(getLatestPeriod(periods, 'standard')?.TimePeriodID).toBe(33);
  });

  it('uses the only standard period when there is nothing to compare', () => {
    expect(getLatestPeriod([periods[0]], 'standard')?.TimePeriodID).toBe(33);
  });

  it('leaves outcome selection on the newest outcome period', () => {
    expect(getLatestPeriod(periods, 'outcome')?.TimePeriodID).toBe(35);
    expect(getLatestPeriod(periods, 'outcome', [partial, previous])?.TimePeriodID).toBe(35);
  });
});
