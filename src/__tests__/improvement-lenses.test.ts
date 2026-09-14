import { describe, expect, it } from 'vitest';
import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import {
  buildGroupRows,
  buildLensRows,
  classifyOpportunityEmpty,
  countUnscoredOpportunity,
  estimatePosition,
  formatPeerPercentilePhrase,
  opportunityAgainst,
  opportunityFor,
  positionPlotAbsence,
} from '@/lib/utils/improvement-lenses';

let nextMetricId = 1;

function category(
  overrides: Partial<IndicatorCategoryData['Data']> = {},
  meta: Partial<Pick<IndicatorCategoryData, 'MetricCategoryTypeName' | 'MetricCategoryName' | 'CategoryAttribute' | 'MetricCategoryOrder'>> = {},
  series: Array<[number, number | null]> = [],
): IndicatorCategoryData {
  return {
    CategoryAttribute: 'Persons',
    MetricCategoryID: 1,
    MetricCategoryName: 'Persons',
    MetricCategoryOrder: 1,
    MetricCategoryTypeName: 'Sex',
    MetricID: nextMetricId++,
    ...meta,
    Data: {
      AreaID: 1,
      Value: 60,
      LowerConfidenceLimit: null,
      UpperConfidenceLimit: null,
      Numerator: 6000,
      Denominator: 10000,
      TimePeriodID: 3,
      Count: null,
      Median: 64,
      DataID: 1,
      Factor: null,
      Min: 40,
      Max: 80,
      Q20: 50,
      Q40: 58,
      Q60: 68,
      Q80: 72,
      ValueNote: null,
      ...overrides,
    },
    TimeSeries: series.map(([value, median], index) => ({
      TimePeriodID: index + 1,
      TimePeriodName: `Period ${index + 1}`,
      Value: value,
      Median: median,
      StartDate: `2025-0${index + 1}-01`,
      EndDate: `2025-0${index + 1}-28`,
    })),
  };
}

function indicator(code: string, shortName: string, categories: IndicatorCategoryData[], id: number): IndicatorWithData {
  return {
    IndicatorID: id,
    IndicatorCode: code,
    IndicatorName: shortName,
    IndicatorShortName: shortName,
    IndicatorOrder: id,
    FormatDisplayName: 'Proportion %',
    IndicatorFormatID: 1,
    AxisCharacter: '%',
    MetricCategoryTypeName: 'Sex',
    Categories: categories,
  } as unknown as IndicatorWithData;
}

describe('improvement lenses', () => {
  it('turns the gap to each comparator into patients', () => {
    const [row] = buildLensRows([
      indicator('CVDP002AF', 'AF: Treated with anticoagulants', [category()], 1),
    ]);
    expect(row.opportunity).toMatchObject({ toMedian: 400, toTop: 1200, gapToMedian: 4, gapToTop: 12 });
    expect(opportunityFor(row, 'top').patients).toBe(1200);
    expect(opportunityAgainst(row, 61)).toEqual({ patients: 100, gap: 1 });
    expect(opportunityFor(row, 'area:7', new Map([['CVDP002AF', 58]]))).toEqual({ patients: 0, gap: -2 });
    expect(opportunityFor(row, 'area:7', new Map()).patients).toBeNull();
  });

  it('counts detection-gap patients against the lower boundary', () => {
    const [row] = buildLensRows([
      indicator('CVDP005HYP', 'Hypertension: High risk – one high BP with no recorded hypertension', [
        category({ Value: 2, Median: 1.5, Min: 0.5, Q20: 1, Q40: 1.3, Q60: 1.7, Q80: 2.1, Max: 3, Numerator: 200, Denominator: 10000 }),
      ], 2),
    ]);
    expect(row.opportunity).toMatchObject({ toMedian: 50, toTop: 100, flagged: 200 });
  });

  it('reports no opportunity for rates and prevalence', () => {
    const rows = buildLensRows([
      indicator('CVDP001AF', 'AF: Prevalence', [category()], 3),
      { ...indicator('CVDP001MORT', 'CVD: All-cause mortality', [category()], 4), FormatDisplayName: 'Rate per 100,000' } as unknown as IndicatorWithData,
    ]);
    expect(rows.map((row) => row.opportunity)).toEqual([null, null]);
  });

  it('estimates position from the quintile boundaries in the favourable direction', () => {
    const bounds = { min: 40, q20: 50, q40: 58, median: 64, q60: 68, q80: 72, max: 80 };
    expect(estimatePosition(60, bounds, false)).toBe(43);
    expect(estimatePosition(60, bounds, true)).toBe(57);
    expect(estimatePosition(40, bounds, false)).toBe(0);
    expect(estimatePosition(85, bounds, false)).toBe(100);
  });

  it('phrases a low favourability percentile as behind peers, not better than them', () => {
    expect(formatPeerPercentilePhrase(7, 'ICBs')).toBe('behind 93% of ICBs');
    expect(formatPeerPercentilePhrase(0, 'ICBs')).toBe('behind 100% of ICBs');
    expect(formatPeerPercentilePhrase(49)).toBe('behind 51%');
    expect(formatPeerPercentilePhrase(7.4, 'ICBs')).toBe('behind 93% of ICBs');
  });

  it('phrases a high favourability percentile as ahead of that share of peers', () => {
    expect(formatPeerPercentilePhrase(85, 'ICBs')).toBe('ahead of 85% of ICBs');
    expect(formatPeerPercentilePhrase(50, 'PCNs')).toBe('ahead of 50% of PCNs');
    expect(formatPeerPercentilePhrase(100)).toBe('ahead of 100%');
  });

  it('omits percentile copy when position is missing', () => {
    expect(formatPeerPercentilePhrase(null, 'ICBs')).toBeNull();
    expect(formatPeerPercentilePhrase(undefined)).toBeNull();
    expect(formatPeerPercentilePhrase(Number.NaN)).toBeNull();
  });

  it('phrases polarity-adjusted estimates so overtreatment behind peers does not read as better', () => {
    const [overtreatment] = buildLensRows([
      indicator('CVDP006HYP', 'Hypertension: Potential antihypertensive overtreatment', [
        category({ Value: 0.65, Median: 0.58, Min: 0.2, Q20: 0.4, Q40: 0.5, Q60: 0.7, Q80: 0.9, Max: 1.2 }),
      ], 30),
    ]);
    expect(overtreatment.lowerIsBetter).toBe(true);
    expect(overtreatment.position).toBeLessThan(50);
    expect(formatPeerPercentilePhrase(overtreatment.position, 'ICBs')).toMatch(/^behind \d+% of ICBs$/);

    const [treated] = buildLensRows([
      indicator('CVDP002AF', 'AF: Treated with anticoagulants', [
        category({ Value: 72, Median: 64 }),
      ], 31),
    ]);
    expect(treated.lowerIsBetter).toBe(false);
    expect(treated.position).toBeGreaterThan(50);
    expect(formatPeerPercentilePhrase(treated.position, 'ICBs')).toMatch(/^ahead of \d+% of ICBs$/);
  });

  it('describes whether the gap to the median is closing', () => {
    const [row] = buildLensRows([
      indicator('CVDP002AF', 'AF: Treated', [category({}, {}, [[50, 60], [54, 61], [58, 62], [60, 64]])], 5),
    ]);
    expect(row.gapSeries).toEqual([-10, -7, -4, -4]);
    expect(row.gapNow).toBe(-4);
    expect(row.gapChange).toBe(6);
    expect(row.gapDirection).toBe('closing');
    expect(row.movement).toBeCloseTo(2 / 22);
  });

  it('builds group cells with a favourable-signed difference and gradient', () => {
    const rows = buildLensRows([
      indicator('CVDP002AF', 'AF: Treated', [
        category(),
        category({ Value: 55 }, { MetricCategoryTypeName: 'Deprivation quintile', MetricCategoryName: '1 - most deprived', MetricCategoryOrder: 1 }),
        category({ Value: 58 }, { MetricCategoryTypeName: 'Deprivation quintile', MetricCategoryName: '2', MetricCategoryOrder: 2 }),
        category({ Value: 60 }, { MetricCategoryTypeName: 'Deprivation quintile', MetricCategoryName: '3', MetricCategoryOrder: 3 }),
        category({ Value: 63 }, { MetricCategoryTypeName: 'Deprivation quintile', MetricCategoryName: '4', MetricCategoryOrder: 4 }),
        category({ Value: null, ValueNote: 'Suppressed' }, { MetricCategoryTypeName: 'Deprivation quintile', MetricCategoryName: '5 - least deprived', MetricCategoryOrder: 5 }),
      ], 6),
    ]);
    const [group] = buildGroupRows(rows, 'Deprivation quintile');
    expect(group.cells.map((cell) => cell.diff)).toEqual([-5, -2, 0, 3, null]);
    expect(group.cells[4].suppressed).toBe(true);
    expect(group.worstDiff).toBe(-5);
    expect(group.gradient).toBe(8);
  });

  it('flips the sign of group differences when lower is better', () => {
    const rows = buildLensRows([
      indicator('CVDP005HYP', 'Hypertension: High risk – one high BP with no recorded hypertension', [
        category({ Value: 2 }),
        category({ Value: 3 }, { MetricCategoryTypeName: 'Sex', MetricCategoryName: 'Male', MetricCategoryOrder: 2 }),
        category({ Value: 1 }, { MetricCategoryTypeName: 'Sex', MetricCategoryName: 'Female', MetricCategoryOrder: 3 }),
      ], 7),
    ]);
    const [group] = buildGroupRows(rows, 'Sex');
    expect(group.cells.map((cell) => [cell.label, cell.diff])).toEqual([['Male', -1], ['Female', 1]]);
    expect(group.gradient).toBeNull();
  });

  it('does not treat a missing peer range as already at target', () => {
    const [row] = buildLensRows([
      indicator('CVDP002AF', 'AF: Treated', [
        category({ Median: null, Min: null, Max: null, Q20: null, Q40: null, Q60: null, Q80: null }),
      ], 20),
    ]);
    expect(row.peer).toBeNull();
    expect(row.opportunity?.toMedian).toBeNull();
    expect(row.opportunity?.toTop).toBeNull();
    expect(classifyOpportunityEmpty({
      filteredRowCount: 1,
      opportunityCount: 1,
      scoredCount: 0,
      activeCount: 0,
      target: 'median',
    })).toBe('peer-range-unavailable');
    expect(countUnscoredOpportunity([row], 'median')).toBe(1);
  });

  it('explains a missing parent comparison instead of claiming the target is met', () => {
    expect(classifyOpportunityEmpty({
      filteredRowCount: 3,
      opportunityCount: 3,
      scoredCount: 0,
      activeCount: 0,
      target: 'area:9',
      comparison: { isLoading: false, valueCount: 0 },
    })).toBe('comparison-unavailable');
    expect(classifyOpportunityEmpty({
      filteredRowCount: 3,
      opportunityCount: 3,
      scoredCount: 0,
      activeCount: 0,
      target: 'area:9',
      comparison: null,
      ancestorsLoading: true,
    })).toBe('loading-comparison');
  });

  it('keeps a genuine at-target empty list distinct from missing data', () => {
    expect(classifyOpportunityEmpty({
      filteredRowCount: 2,
      opportunityCount: 2,
      scoredCount: 2,
      activeCount: 0,
      target: 'median',
    })).toBe('at-target');
    expect(classifyOpportunityEmpty({
      filteredRowCount: 2,
      opportunityCount: 0,
      scoredCount: 0,
      activeCount: 0,
      target: 'median',
    })).toBe('no-opportunity');
    expect(classifyOpportunityEmpty({
      filteredRowCount: 2,
      opportunityCount: 2,
      scoredCount: 1,
      activeCount: 1,
      target: 'median',
    })).toBeNull();
  });

  it('separates recorded prevalence, missing peers and missing history on the position chart', () => {
    const [treated] = buildLensRows([
      indicator('CVDP002AF', 'AF: Treated', [category({ Median: null })], 21),
    ]);
    const [prevalence] = buildLensRows([
      indicator('CVDP001AF', 'AF: Prevalence', [category()], 22),
    ]);
    const [noHistory] = buildLensRows([
      indicator('CVDP003AF', 'AF: Controlled', [category({}, {}, [])], 23),
    ]);
    expect(positionPlotAbsence(treated)).toBe('no-peer');
    expect(positionPlotAbsence(prevalence)).toBe('prevalence');
    expect(noHistory.position).not.toBeNull();
    expect(noHistory.movement).toBeNull();
    expect(positionPlotAbsence(noHistory)).toBe('no-history');
  });
});
