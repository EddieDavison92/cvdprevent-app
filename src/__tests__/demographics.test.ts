import { describe, expect, it } from 'vitest';
import type { IndicatorRawData } from '@/lib/api/types';
import {
  findDemographicItem,
  formatDemographicCategoryLabel,
  getAvailableDemographics,
  getDemographicCategoryNames,
  isSuppressedDemographicValue,
} from '@/lib/utils/demographics';

function item(type: string, name: string, attribute = 'Persons'): IndicatorRawData {
  return {
    IndicatorID: 1,
    AreaCode: 'TEST',
    AreaName: 'Test area',
    TimePeriodID: 1,
    TimePeriodName: 'Latest',
    MetricCategoryTypeName: type,
    MetricCategoryName: name,
    CategoryAttribute: attribute,
    Numerator: 10,
    Denominator: 20,
    Value: 50,
    LowerCI: null,
    UpperCI: null,
    ComparedToEnglandValue: null,
    ComparedToEnglandID: null,
  };
}

describe('demographic breakdowns', () => {
  it('exposes SMI, learning disability and age-standardised categories', () => {
    const data = [
      item('Mental Health', 'People with SMI'),
      item('Learning Disability', 'People with a diagnosed learning disability'),
      item('Sex - Age Standardised', 'Persons'),
    ];

    expect(getAvailableDemographics(data, []).map((demo) => demo.type)).toEqual([
      'Sex - Age Standardised',
      'Mental Health',
      'Learning Disability',
    ]);
    expect(getAvailableDemographics(data, [], true).map((demo) => demo.type)).toEqual([
      'Mental Health',
      'Learning Disability',
    ]);
  });

  it('uses Persons for age groups instead of a sex-specific row', () => {
    const data = [
      item('Age group', '40-59', 'Male'),
      item('Age group', '40-59', 'Persons'),
    ];

    expect(getDemographicCategoryNames('Age group', data, [])).toEqual(['40-59']);
    expect(findDemographicItem(data, 'Age group', '40-59')?.CategoryAttribute).toBe('Persons');
  });

  it('shortens clinical group labels', () => {
    expect(formatDemographicCategoryLabel('People with SMI')).toBe('With SMI');
    expect(formatDemographicCategoryLabel('People without a diagnosed learning disability'))
      .toBe('Without learning disability');
  });

  it('distinguishes a suppressed result from a missing result', () => {
    const suppressed = { ...item('Ethnicity', 'Mixed'), Value: null, ValueNote: 'Value suppressed for disclosure control' };
    const missing = { ...item('Ethnicity', 'Other'), Value: null, ValueNote: null };

    expect(isSuppressedDemographicValue(suppressed)).toBe(true);
    expect(isSuppressedDemographicValue(missing)).toBe(false);
  });
});
