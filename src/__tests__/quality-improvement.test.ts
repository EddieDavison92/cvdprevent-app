import { describe, expect, it } from 'vitest';
import type { IndicatorCategoryData } from '@/lib/api/types';
import {
  assessQualityImprovementRow,
  buildPopulationVariationRows,
  countSuppressedCategories,
  getDefaultMarkerOption,
  getCategoryTrend,
  getMarkerGroupLabel,
  getMarkerLabel,
  getQuintiles,
} from '@/lib/utils/quality-improvement';
import type { QualityImprovementRow } from '@/lib/utils/quality-improvement';

function category(overrides: Partial<IndicatorCategoryData['Data']> = {}): IndicatorCategoryData {
  return {
    CategoryAttribute: 'Persons',
    MetricCategoryID: 1,
    MetricCategoryName: 'Persons',
    MetricCategoryOrder: 1,
    MetricCategoryTypeName: 'Sex',
    MetricID: 1,
    Data: {
      AreaID: 1,
      Value: 20,
      LowerConfidenceLimit: null,
      UpperConfidenceLimit: null,
      Numerator: 20,
      Denominator: 100,
      TimePeriodID: 3,
      Count: null,
      Median: 18,
      DataID: 1,
      Factor: null,
      Min: 0,
      Max: 50,
      Q20: 10,
      Q40: 20,
      Q60: 30,
      Q80: 40,
      ValueNote: null,
      ...overrides,
    },
    TimeSeries: [],
  };
}

describe('quality improvement calculations', () => {
  it('includes both quintiles when a value lies on a shared boundary', () => {
    expect(getQuintiles(category())).toEqual([2, 3]);
  });

  it('compares the latest two published periods', () => {
    const item = category();
    item.TimeSeries = [
      { TimePeriodID: 1, TimePeriodName: 'One', Value: 10, Median: null, StartDate: '2025-01-01', EndDate: '2025-03-31' },
      { TimePeriodID: 2, TimePeriodName: 'Two', Value: 50, Median: null, StartDate: '2025-04-01', EndDate: '2025-06-30' },
      { TimePeriodID: 3, TimePeriodName: 'Three', Value: 52, Median: null, StartDate: '2025-07-01', EndDate: '2025-09-30' },
    ];

    expect(getCategoryTrend(item)).toMatchObject({ latest: { change: 2, direction: 'up' }, overall: { change: 2, direction: 'up' } });
  });

  it('does not infer a trend from one observation', () => {
    const item = category();
    item.TimeSeries = [
      { TimePeriodID: 1, TimePeriodName: 'One', Value: 10, Median: null, StartDate: '2025-01-01', EndDate: '2025-03-31' },
    ];

    expect(getCategoryTrend(item)).toMatchObject({ latest: null, overall: null });
  });

  it('counts disclosure-controlled values separately from missing data', () => {
    const suppressed = category({ Value: null, ValueNote: 'Value suppressed for disclosure control' });
    const missing = category({ Value: null, ValueNote: null });
    const indicator = { Categories: [suppressed, missing] } as QualityImprovementRow['indicator'];

    expect(countSuppressedCategories([indicator], 'all')).toBe(1);
  });

  it('translates API marker names without duplicating attributes', () => {
    const item = category();
    item.MetricCategoryTypeName = 'Sex - Age Standardised';
    item.MetricCategoryName = 'Male';
    item.CategoryAttribute = 'Male';

    expect(getMarkerGroupLabel(item.MetricCategoryTypeName)).toBe('Sex (age-standardised)');
    expect(getMarkerLabel(item)).toBe('Male (age-standardised)');
  });

  it('defaults a breakdown to its all-patients marker', () => {
    expect(getDefaultMarkerOption([
      { value: 'female', label: 'Female', group: 'Sex', isPersons: false },
      { value: 'persons', label: 'All patients', group: 'Sex', isPersons: true },
    ])?.value).toBe('persons');
  });

  it('uses indicator polarity to describe gaps and movement', () => {
    const indicator = {
      IndicatorID: 1,
      IndicatorCode: 'CVDP005HYP',
      IndicatorName: 'Detection gap',
      IndicatorShortName: 'Hypertension: High risk with no diagnosis',
      FormatDisplayName: 'Proportion %',
    } as QualityImprovementRow['indicator'];
    const row = {
      indicator,
      category: category({ Value: 3, Median: 2 }),
      markerLabel: 'All patients',
      value: 3,
      median: 2,
      min: 0,
      max: 5,
      quintiles: [5],
      trend: 0.5,
      trendDirection: 'up',
      overallTrend: 0.5,
      trendValues: [2.5, 3],
    } satisfies QualityImprovementRow;

    expect(assessQualityImprovementRow(row)).toMatchObject({
      gap: 1,
      performanceGap: -1,
      status: 'unfavourable',
      trendStatus: 'deteriorating',
    });
  });

  it('describes recorded prevalence without treating lower recording as better', () => {
    const indicator = {
      IndicatorID: 1,
      IndicatorCode: 'CVDP001HYP',
      IndicatorName: 'Recorded prevalence',
      IndicatorShortName: 'Hypertension: Prevalence',
      FormatDisplayName: 'Proportion %',
    } as QualityImprovementRow['indicator'];
    const row = {
      indicator,
      category: category({ Value: 12, Median: 18 }),
      markerLabel: 'All patients',
      value: 12,
      median: 18,
      min: 0,
      max: 30,
      quintiles: [1],
      trend: 0.3,
      trendDirection: 'up',
      overallTrend: 0.3,
      trendValues: [11.7, 12],
    } satisfies QualityImprovementRow;

    expect(assessQualityImprovementRow(row)).toMatchObject({
      status: 'recording',
      trendStatus: 'recording',
    });
  });

  it('finds the population group with the most unfavourable result', () => {
    const overall = category({ Value: 80 });
    const younger = category({ Value: 60 });
    younger.MetricCategoryTypeName = 'Age group';
    younger.MetricCategoryName = '18-39';
    const older = category({ Value: 90 });
    older.MetricCategoryTypeName = 'Age group';
    older.MetricCategoryName = '80+';
    const indicator = {
      IndicatorID: 1,
      IndicatorCode: 'CVDP002AF',
      IndicatorName: 'Treatment',
      IndicatorShortName: 'AF: Treated with anticoagulants',
      FormatDisplayName: 'Proportion %',
      Categories: [overall, younger, older],
    } as QualityImprovementRow['indicator'];

    const [row] = buildPopulationVariationRows([indicator], 'Age group');
    expect(row).toMatchObject({
      overallValue: 80,
      mostUnfavourable: { label: '18–39', value: 60 },
      gap: -20,
      performanceGap: -20,
    });
  });

  it('treats recorded prevalence differences as descriptive variation', () => {
    const overall = category({ Value: 20 });
    const younger = category({ Value: 5 });
    younger.MetricCategoryTypeName = 'Age group';
    younger.MetricCategoryName = '18-39';
    const older = category({ Value: 50 });
    older.MetricCategoryTypeName = 'Age group';
    older.MetricCategoryName = '80+';
    const indicator = {
      IndicatorID: 1,
      IndicatorCode: 'CVDP001HYP',
      IndicatorName: 'Recorded prevalence',
      IndicatorShortName: 'Hypertension: Prevalence',
      FormatDisplayName: 'Proportion %',
      Categories: [overall, younger, older],
    } as QualityImprovementRow['indicator'];

    const [row] = buildPopulationVariationRows([indicator], 'Age group');
    expect(row).toMatchObject({
      isRecordedPrevalence: true,
      mostUnfavourable: { label: '80+', value: 50 },
      gap: 30,
    });
  });
});
