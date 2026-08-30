import { describe, expect, it } from 'vitest';
import type { IndicatorRawData } from '@/lib/api/types';
import { computePopulationShares } from '@/lib/utils/population-profile';

const categories = ['Asian', 'Unknown', 'White'];
const demo = { type: 'Ethnicity', label: 'By Ethnicity', excludeCategories: [] };

function row(
  type: string,
  name: string,
  denominator: number | null,
  valueNote: string | null = null,
  categoryAttribute?: string,
): IndicatorRawData {
  return {
    IndicatorID: 1,
    AreaCode: 'TEST',
    AreaName: 'Test area',
    TimePeriodID: 33,
    TimePeriodName: 'To March 2026',
    MetricCategoryTypeName: type,
    MetricCategoryName: name,
    CategoryAttribute: categoryAttribute,
    Numerator: null,
    Denominator: denominator,
    Value: null,
    LowerCI: null,
    UpperCI: null,
    ComparedToEnglandValue: null,
    ComparedToEnglandID: null,
    ValueNote: valueNote,
  };
}

describe('computePopulationShares', () => {
  it('uses the full eligible population and preserves suppressed categories', () => {
    const areaData = [
      row('Sex', 'Persons', 130),
      row('Ethnicity', 'Asian', null, 'Value suppressed for disclosure control', 'Persons'),
      row('Ethnicity', 'Missing', null, 'Value suppressed for disclosure control', 'Persons'),
      row('Ethnicity', 'Not stated', null, 'Value suppressed for disclosure control', 'Persons'),
      row('Ethnicity', 'White', 115, null, 'Persons'),
    ];
    const baselineData = [
      row('Sex', 'Persons', 1_000),
      row('Ethnicity', 'Asian', 100, null, 'Persons'),
      row('Ethnicity', 'Missing', 20, null, 'Persons'),
      row('Ethnicity', 'Not stated', 30, null, 'Persons'),
      row('Ethnicity', 'White', 850, null, 'Persons'),
    ];

    const result = computePopulationShares(demo, areaData, baselineData, categories);

    expect(result).not.toBeNull();
    expect(result?.find((item) => item.name === 'White')).toMatchObject({
      areaShare: (115 / 130) * 100,
      baselineShare: 85,
    });
    expect(result?.find((item) => item.name === 'Asian')).toMatchObject({
      areaShare: null,
      areaSuppressed: true,
    });
    expect(result?.find((item) => item.name === 'Unknown')).toMatchObject({
      areaShare: null,
      areaSuppressed: true,
      baselineDenominator: 50,
      baselineShare: 5,
    });
  });
});
