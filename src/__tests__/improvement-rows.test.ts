import { describe, expect, it } from 'vitest';
import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import {
  buildImprovementRows,
  compareImprovementRows,
  countImprovementSignals,
} from '@/lib/utils/improvement-rows';

let nextMetricId = 1;

function category(
  overrides: Partial<IndicatorCategoryData['Data']> = {},
  meta: Partial<Pick<IndicatorCategoryData, 'MetricCategoryTypeName' | 'MetricCategoryName' | 'CategoryAttribute'>> = {},
  series: number[] = [],
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
      Numerator: 60,
      Denominator: 100,
      TimePeriodID: 3,
      Count: null,
      Median: 60,
      DataID: 1,
      Factor: null,
      Min: 40,
      Max: 80,
      Q20: 50,
      Q40: 55,
      Q60: 65,
      Q80: 70,
      ValueNote: null,
      ...overrides,
    },
    TimeSeries: series.map((value, index) => ({
      TimePeriodID: index + 1,
      TimePeriodName: `Period ${index + 1}`,
      Value: value,
      Median: null,
      StartDate: `2025-0${index + 1}-01`,
      EndDate: `2025-0${index + 1}-28`,
    })),
  };
}

function indicator(
  code: string,
  shortName: string,
  categories: IndicatorCategoryData[],
  id = code.length,
): IndicatorWithData {
  return {
    IndicatorID: id,
    IndicatorCode: code,
    IndicatorName: shortName,
    IndicatorShortName: shortName,
    IndicatorOrder: id,
    FormatDisplayName: 'Percentage (%)',
    IndicatorFormatID: 1,
    AxisCharacter: '%',
    MetricCategoryTypeName: 'Sex',
    Categories: categories,
  } as unknown as IndicatorWithData;
}

describe('improvement rows', () => {
  it('flags an indicator behind the peer median as a peers signal', () => {
    const rows = buildImprovementRows([
      indicator('CVDP002AF', 'AF: Treated with anticoagulants', [category({ Value: 48 }, {}, [50, 48])], 1),
    ]);
    expect(rows[0].signals).toEqual(['peers', 'deteriorating']);
    expect(rows[0].peer?.band).toBe('worst');
  });

  it('does not treat lower recorded prevalence as behind peers', () => {
    const rows = buildImprovementRows([
      indicator('CVDP001AF', 'AF: Prevalence', [category({ Value: 1, Median: 3, Min: 0.5, Max: 4, Q20: 2, Q40: 2.5, Q60: 3.2, Q80: 3.6 })], 2),
    ]);
    expect(rows[0].signals).toEqual(['detection']);
    expect(rows[0].peer?.status).toBe('recording');
  });

  it('flags a materially unfavourable patient group', () => {
    const rows = buildImprovementRows([
      indicator('CVDP009CHOL', 'Cholesterol: CVD treated with LLT', [
        category({ Value: 90 }, {}, [89, 90]),
        category({ Value: 60 }, { MetricCategoryTypeName: 'Age group', MetricCategoryName: '18-39' }),
        category({ Value: 92 }, { MetricCategoryTypeName: 'Age group', MetricCategoryName: '40-59' }),
      ], 3),
    ]);
    expect(rows[0].signals).toEqual(['variation']);
    expect(rows[0].variation?.mostUnfavourable.label).toBe('18–39');
  });

  it('skips peer signals when peers are excluded', () => {
    const rows = buildImprovementRows([
      indicator('CVDP002AF', 'AF: Treated with anticoagulants', [category({ Value: 48 }, {}, [50, 48])], 1),
    ], { includePeers: false });
    expect(rows[0].peer).toBeNull();
    expect(rows[0].signals).toEqual(['deteriorating']);
  });

  it('orders rows by signal count, then peer position', () => {
    const rows = buildImprovementRows([
      indicator('CVDP002AF', 'AF: Treated', [category({ Value: 48 }, {}, [50, 48])], 1),
      indicator('CVDP005CKD', 'CKD: Treated', [category({ Value: 53 }, {}, [53, 53])], 2),
      indicator('CVDP003CHOL', 'Cholesterol: Treated', [category({ Value: 70 }, {}, [69, 70])], 3),
    ]).sort((a, b) => compareImprovementRows(a, b, 'priority'));
    expect(rows.map((row) => row.indicator.IndicatorCode)).toEqual(['CVDP002AF', 'CVDP005CKD', 'CVDP003CHOL']);
    expect(rows[2].signals).toEqual([]);
  });

  it('counts each signal once per indicator', () => {
    const rows = buildImprovementRows([
      indicator('CVDP002AF', 'AF: Treated', [category({ Value: 48 }, {}, [50, 48])], 1),
      indicator('CVDP005CKD', 'CKD: Treated', [category({ Value: 53 }, {}, [53, 53])], 2),
    ]);
    expect(countImprovementSignals(rows)).toEqual({ peers: 2, deteriorating: 1, variation: 0, detection: 0 });
  });
});
