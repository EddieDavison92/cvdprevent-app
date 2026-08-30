import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';
import { classifyIndicator } from '@/lib/constants/indicator-sections';
import { summariseTrend, type TrendDirection } from '@/lib/utils/trend';

export type MarkerSelection = 'persons' | 'all' | string;
export type Quintile = 1 | 2 | 3 | 4 | 5;

export interface MarkerOption {
  value: string;
  label: string;
  group: string;
  isPersons: boolean;
}

export interface QualityImprovementRow {
  indicator: IndicatorWithData;
  category: IndicatorCategoryData;
  markerLabel: string;
  value: number;
  median: number | null;
  min: number | null;
  max: number | null;
  quintiles: Quintile[];
  /** Change between the latest two periods. */
  trend: number | null;
  /** Direction across the series (see summariseTrend). */
  trendDirection: TrendDirection | null;
  /** Change across the series. */
  overallTrend: number | null;
  trendValues: number[];
}

export type PerformanceStatus = 'favourable' | 'unfavourable' | 'similar' | 'recording' | 'unavailable';

export interface QualityImprovementAssessment {
  gap: number | null;
  performanceGap: number | null;
  status: PerformanceStatus;
  trendStatus: 'improving' | 'deteriorating' | 'stable' | 'recording' | 'history';
}

export function assessQualityImprovementRow(row: QualityImprovementRow): QualityImprovementAssessment {
  const classification = classifyIndicator(row.indicator);
  const isRecordedPrevalence = classification.section.id === 'prevalence';
  const gap = row.median === null ? null : row.value - row.median;
  const performanceGap = gap === null ? null : classification.lowerIsBetter ? -gap : gap;

  let status: PerformanceStatus = 'unavailable';
  if (gap !== null) {
    if (isRecordedPrevalence) status = 'recording';
    else if (Math.abs(gap) <= COMPARISON_TOLERANCE) status = 'similar';
    else status = performanceGap! > 0 ? 'favourable' : 'unfavourable';
  }

  let trendStatus: QualityImprovementAssessment['trendStatus'] = 'history';
  if (row.trendDirection !== null) {
    if (row.trendDirection === 'flat') trendStatus = 'stable';
    else if (isRecordedPrevalence) trendStatus = 'recording';
    else {
      const improving = classification.lowerIsBetter
        ? row.trendDirection === 'down'
        : row.trendDirection === 'up';
      trendStatus = improving ? 'improving' : 'deteriorating';
    }
  }

  return { gap, performanceGap, status, trendStatus };
}

export function markerKey(category: IndicatorCategoryData): string {
  return [
    category.MetricCategoryTypeName,
    category.MetricCategoryName,
    category.CategoryAttribute,
  ].join('|');
}

const MARKER_GROUP_LABELS: Record<string, string> = {
  'Age group': 'Age group',
  'Deprivation quintile': 'Deprivation',
  'Deprivation quintile - Age Standardised': 'Deprivation (age-standardised)',
  Ethnicity: 'Ethnicity',
  'Ethnicity (broad)': 'Ethnicity (broad groups)',
  'Learning Disability': 'Learning disability',
  'Mental Health': 'Severe mental illness (SMI)',
  Sex: 'Sex',
  'Sex - Age Standardised': 'Sex (age-standardised)',
};

function cleanCategoryName(name: string): string {
  return name
    .replace(/^(\d)\s*-\s*(most|least) deprived$/i, '$1 ($2 deprived)')
    .replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

export function getMarkerGroupLabel(group: string): string {
  return MARKER_GROUP_LABELS[group] ?? group.replace(/\s*-\s*Age Standardised/i, ' (age-standardised)');
}

export function getMarkerLabel(category: IndicatorCategoryData): string {
  const name = cleanCategoryName(category.MetricCategoryName);
  const attribute = category.CategoryAttribute;
  const ageStandardised = /Age Standardised/i.test(category.MetricCategoryTypeName);

  if (category.MetricCategoryTypeName.startsWith('Sex')) {
    if (name === 'Persons') return ageStandardised ? 'All patients (age-standardised)' : 'All patients';
    return ageStandardised ? `${name} (age-standardised)` : name;
  }

  if (attribute && attribute !== 'Persons' && attribute !== category.MetricCategoryName) {
    return `${name} — ${cleanCategoryName(attribute)}`;
  }
  return name;
}

export function getMarkerOptions(indicators: IndicatorWithData[]): MarkerOption[] {
  const options = new Map<string, MarkerOption>();

  for (const indicator of indicators) {
    for (const category of indicator.Categories) {
      if (category.Data.Value === null) continue;
      const value = markerKey(category);
      options.set(value, {
        value,
        label: getMarkerLabel(category),
        group: category.MetricCategoryTypeName,
        isPersons: category.CategoryAttribute === 'Persons' || category.MetricCategoryName === 'Persons',
      });
    }
  }

  return [...options.values()].sort((a, b) => (
    a.group.localeCompare(b.group) || a.label.localeCompare(b.label)
  ));
}

export function getDefaultMarkerOption(options: MarkerOption[]): MarkerOption | undefined {
  return options.find((option) => option.isPersons) ?? options[0];
}

export function getQuintiles(category: IndicatorCategoryData): Quintile[] {
  const { Value: value, Min: min, Q20: q20, Q40: q40, Q60: q60, Q80: q80, Max: max } = category.Data;
  if ([value, min, q20, q40, q60, q80, max].some((item) => item === null)) return [];

  const ranges: Array<[Quintile, number, number]> = [
    [1, min!, q20!],
    [2, q20!, q40!],
    [3, q40!, q60!],
    [4, q60!, q80!],
    [5, q80!, max!],
  ];

  return ranges
    .filter(([, lower, upper]) => value! >= lower && value! <= upper)
    .map(([quintile]) => quintile);
}

export function getCategoryTrend(category: IndicatorCategoryData) {
  const values = category.TimeSeries
    .slice()
    .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime())
    .map((point) => point.Value);
  return summariseTrend(values);
}

function selectedCategories(indicator: IndicatorWithData, marker: MarkerSelection) {
  if (marker === 'persons') {
    return indicator.Categories.filter(
      (category) => category.MetricCategoryTypeName === 'Sex'
        && category.MetricCategoryName === 'Persons'
    );
  }
  if (marker === 'all') return indicator.Categories;
  return indicator.Categories.filter((category) => markerKey(category) === marker);
}

export function buildQualityImprovementRows(
  indicators: IndicatorWithData[],
  marker: MarkerSelection,
): QualityImprovementRow[] {
  return indicators.flatMap((indicator) => (
    selectedCategories(indicator, marker)
      .filter((category) => category.Data.Value !== null)
      .map((category) => {
        const trend = getCategoryTrend(category);
        return {
          indicator,
          category,
          markerLabel: getMarkerLabel(category),
          value: category.Data.Value!,
          median: category.Data.Median,
          min: category.Data.Min,
          max: category.Data.Max,
          quintiles: getQuintiles(category),
          trend: trend.latest?.change ?? null,
          trendDirection: trend.overall?.direction ?? null,
          overallTrend: trend.overall?.change ?? null,
          trendValues: trend.values,
        };
      })
  ));
}
