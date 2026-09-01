import { describe, expect, it } from 'vitest';
import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import { buildFocusSignals } from '@/lib/utils/focus-signals';

interface CategoryOptions {
  type?: string;
  value: number;
  median: number;
  q20: number;
  q40: number;
  q60: number;
  q80: number;
  lower?: number;
  upper?: number;
  timeSeries?: number[];
}

function category({
  type = 'Sex',
  value,
  median,
  q20,
  q40,
  q60,
  q80,
  lower = value - 0.1,
  upper = value + 0.1,
  timeSeries = [value],
}: CategoryOptions): IndicatorCategoryData {
  return {
    CategoryAttribute: 'Persons',
    MetricCategoryID: type === 'Sex' ? 1 : 2,
    MetricCategoryName: 'Persons',
    MetricCategoryOrder: 1,
    MetricCategoryTypeName: type,
    MetricID: type === 'Sex' ? 1 : 2,
    Data: {
      AreaID: 1,
      Value: value,
      LowerConfidenceLimit: lower,
      UpperConfidenceLimit: upper,
      Numerator: null,
      Denominator: null,
      TimePeriodID: 33,
      Count: null,
      Median: median,
      DataID: 1,
      Factor: null,
      Min: q20 - 5,
      Max: q80 + 5,
      Q20: q20,
      Q40: q40,
      Q60: q60,
      Q80: q80,
      ValueNote: null,
    },
    TimeSeries: timeSeries.map((pointValue, index) => ({
      TimePeriodID: index + 1,
      TimePeriodName: `Period ${index + 1}`,
      Value: pointValue,
      Median: median,
      StartDate: `${2024 + index}-01-01`,
      EndDate: `${2024 + index}-03-31`,
    })),
  };
}

function indicator(
  code: string,
  categories: IndicatorCategoryData[],
  format = 'Proportion %',
): IndicatorWithData {
  return {
    IndicatorID: Number(code.replace(/\D/g, '')) || 1,
    IndicatorCode: code,
    IndicatorName: code,
    IndicatorShortName: code,
    IndicatorOrder: 1,
    IndicatorFormatID: 1,
    FormatDisplayName: format,
    AxisCharacter: '',
    IndicatorTypeID: 1,
    IndicatorTypeName: 'Standard',
    DataUpdateInterval: null,
    IndicatorStatus: null,
    HighestPriorityNotificationType: null,
    NotificationCount: 0,
    Categories: categories,
  };
}

function baselineFor(source: IndicatorWithData, categories: IndicatorCategoryData[]) {
  return { ...source, Categories: categories };
}

describe('focus signal selection', () => {
  it('does not flag NCL hypertension from its crude prevalence gap', () => {
    const crude = category({ value: 12.66, median: 19.68, q20: 12.66, q40: 17.77, q60: 19.96, q80: 21.57 });
    const standardised = category({
      type: 'Sex - Age Standardised',
      value: 18.15,
      median: 19.53,
      q20: 17.03,
      q40: 18.5,
      q60: 19.55,
      q80: 20.65,
    });
    const source = indicator('CVDP001HYP', [crude, standardised]);
    const baseline = baselineFor(source, [
      category({ value: 18.66, median: 18.66, q20: 18, q40: 18.4, q60: 18.8, q80: 19.2 }),
      category({ type: 'Sex - Age Standardised', value: 19.53, median: 19.53, q20: 19, q40: 19.3, q60: 19.7, q80: 20 }),
    ]);

    expect(buildFocusSignals([source], [baseline])).toEqual([]);
  });

  it('does not flag NWL hypertension when its age-standardised rate matches England', () => {
    const source = indicator('CVDP001HYP', [
      category({ value: 13.25, median: 19.68, q20: 12.66, q40: 17.77, q60: 19.96, q80: 21.57 }),
      category({ type: 'Sex - Age Standardised', value: 19.59, median: 19.53, q20: 17.03, q40: 18.5, q60: 19.55, q80: 20.65 }),
    ]);
    const baseline = baselineFor(source, [
      category({ type: 'Sex - Age Standardised', value: 19.53, median: 19.53, q20: 19, q40: 19.3, q60: 19.7, q80: 20 }),
    ]);

    expect(buildFocusSignals([source], [baseline])).toEqual([]);
  });

  it('does not rank recorded prevalence as good or bad', () => {
    const source = indicator('CVDP001HYP', [
      category({ type: 'Sex - Age Standardised', value: 15, median: 19.5, q20: 17, q40: 18.5, q60: 19.6, q80: 20.7 }),
    ]);

    expect(buildFocusSignals([source], [])).toEqual([]);
  });

  it('flags a treatment result in the worst peer fifth without relying on raw units', () => {
    const source = indicator('CVDP002AF', [
      category({ value: 70, median: 85, q20: 75, q40: 82, q60: 87, q80: 91 }),
    ]);

    expect(buildFocusSignals([source], [])).toHaveLength(1);
  });

  it('includes a result in the second-worst peer fifth without corroboration', () => {
    const source = indicator('CVDP002AF', [
      category({ value: 80, median: 85, q20: 75, q40: 82, q60: 87, q80: 91, timeSeries: [79, 80] }),
    ]);

    const [signal] = buildFocusSignals([source], []);
    expect(signal).toMatchObject({
      peerBand: 'second-worst',
      comparisonIsClear: false,
      deteriorating: false,
    });
  });

  it('does not treat a large mortality-unit difference as a focus signal when peer position is favourable', () => {
    const source = indicator('CVDP002MORT', [
      category({ value: 300, median: 350, q20: 280, q40: 330, q60: 370, q80: 420 }),
    ], 'Rate per 100,000');
    const baseline = baselineFor(source, [
      category({ value: 200, median: 350, q20: 280, q40: 330, q60: 370, q80: 420 }),
    ]);

    expect(buildFocusSignals([source], [baseline])).toEqual([]);
  });

  it('includes peer position without inferring deterioration from one value', () => {
    const source = indicator('CVDP002AF', [
      category({ value: 80, median: 85, q20: 75, q40: 82, q60: 87, q80: 91, timeSeries: [80] }),
    ]);

    const [signal] = buildFocusSignals([source], []);
    expect(signal).toMatchObject({
      peerBand: 'second-worst',
      deteriorating: false,
      trend: null,
    });
  });

  it('orders the worst peer fifth before contextual comparison or change', () => {
    const worst = indicator('CVDP002AF', [
      category({ value: 70, median: 85, q20: 75, q40: 82, q60: 87, q80: 91, timeSeries: [70, 71] }),
    ]);
    const secondWorst = indicator('CVDP005AF', [
      category({ value: 80, median: 85, q20: 75, q40: 82, q60: 87, q80: 91, timeSeries: [82, 80] }),
    ]);
    const baseline = [
      baselineFor(secondWorst, [
        category({ value: 86, median: 86, q20: 80, q40: 84, q60: 88, q80: 92, lower: 85.8, upper: 86.2 }),
      ]),
      baselineFor(worst, [
        category({ value: 86, median: 86, q20: 80, q40: 84, q60: 88, q80: 92 }),
      ]),
    ];

    const signals = buildFocusSignals([secondWorst, worst], baseline);
    expect(signals.map((signal) => signal.peerBand)).toEqual(['worst', 'second-worst']);
  });

  it('changes signals when the selected comparison changes', () => {
    const source = indicator('CVDP002AF', [
      category({ value: 80, median: 85, q20: 75, q40: 82, q60: 87, q80: 91 }),
    ]);
    const higherBaseline = baselineFor(source, [
      category({ value: 90, median: 90, q20: 84, q40: 87, q60: 91, q80: 94 }),
    ]);
    const lowerBaseline = baselineFor(source, [
      category({ value: 70, median: 70, q20: 65, q40: 68, q60: 72, q80: 75 }),
    ]);

    expect(buildFocusSignals([source], [higherBaseline])).toHaveLength(1);
    expect(buildFocusSignals([source], [lowerBaseline])).toEqual([]);
  });
});
