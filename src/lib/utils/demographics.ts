import type { IndicatorRawData } from '@/lib/api/types';

export interface DemographicDefinition {
  type: string;
  label: string;
  excludeCategories: string[];
  populationProfile?: boolean;
}

const DEMOGRAPHICS: DemographicDefinition[] = [
  { type: 'Sex', label: 'By Sex', excludeCategories: ['Persons'], populationProfile: true },
  { type: 'Sex - Age Standardised', label: 'By Sex (Age-standardised)', excludeCategories: ['Persons'], populationProfile: false },
  { type: 'Age group', label: 'By Age Group', excludeCategories: [], populationProfile: true },
  { type: 'Deprivation quintile', label: 'By Deprivation Quintile', excludeCategories: [], populationProfile: true },
  { type: 'Deprivation quintile - Age Standardised', label: 'By Deprivation Quintile (Age-standardised)', excludeCategories: [], populationProfile: false },
  { type: 'Ethnicity', label: 'By Ethnicity', excludeCategories: [], populationProfile: true },
  { type: 'Ethnicity (broad)', label: 'By Ethnicity (Broad Groups)', excludeCategories: [], populationProfile: true },
  { type: 'Mental Health', label: 'By Severe Mental Illness (SMI)', excludeCategories: [], populationProfile: true },
  { type: 'Learning Disability', label: 'By Learning Disability', excludeCategories: [], populationProfile: true },
];

export function getAvailableDemographics(
  areaData: IndicatorRawData[],
  baselineData: IndicatorRawData[],
  populationProfileOnly = false,
): DemographicDefinition[] {
  const availableTypes = new Set([...areaData, ...baselineData].map((item) => item.MetricCategoryTypeName));
  return DEMOGRAPHICS.filter(
    (demographic) => availableTypes.has(demographic.type)
      && (!populationProfileOnly || demographic.populationProfile)
  );
}

export function getDemographicCategoryNames(
  type: string,
  areaData: IndicatorRawData[],
  baselineData: IndicatorRawData[],
  excluded: string[] = [],
): string[] {
  const names: string[] = [];
  for (const item of [...areaData, ...baselineData]) {
    if (item.MetricCategoryTypeName !== type || excluded.includes(item.MetricCategoryName)) continue;
    if (type !== 'Sex' && type !== 'Sex - Age Standardised' && item.CategoryAttribute && item.CategoryAttribute !== 'Persons') continue;
    const name = type === 'Ethnicity' && ['Missing', 'Not stated'].includes(item.MetricCategoryName)
      ? 'Unknown'
      : item.MetricCategoryName;
    if (!names.includes(name)) names.push(name);
  }
  if (type === 'Ethnicity' && names.includes('Unknown')) {
    return [...names.filter((name) => name !== 'Unknown'), 'Unknown'];
  }
  return names;
}

export function formatDemographicCategoryLabel(name: string): string {
  const labels: Record<string, string> = {
    'People without SMI': 'Without SMI',
    'People with SMI': 'With SMI',
    'People without a diagnosed learning disability': 'Without learning disability',
    'People with a diagnosed learning disability': 'With learning disability',
    '=< 17': '≤17',
  };
  return labels[name] ?? name.replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

export function findDemographicItem(
  data: IndicatorRawData[],
  type: string,
  name: string,
): IndicatorRawData | undefined {
  const matches = data.filter(
    (item) => item.MetricCategoryTypeName === type && item.MetricCategoryName === name
  );
  if (type === 'Sex' || type === 'Sex - Age Standardised') {
    return matches.find((item) => item.CategoryAttribute === name) ?? matches[0];
  }
  return matches.find((item) => !item.CategoryAttribute || item.CategoryAttribute === 'Persons') ?? matches[0];
}

export function isSuppressedDemographicValue(item: IndicatorRawData | undefined): boolean {
  return item?.Value == null && /suppress/i.test(item?.ValueNote ?? '');
}
