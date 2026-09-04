import { describe, expect, it } from 'vitest';
import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import { buildGroupRows, buildLensRows, estimatePosition, opportunityAgainst, opportunityFor } from '@/lib/utils/improvement-lenses';

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
});
