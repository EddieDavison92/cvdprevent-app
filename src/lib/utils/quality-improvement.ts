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
  /** Direction between the latest two published periods. */
  trendDirection: TrendDirection | null;
  /** Alias of the latest change retained for presentation. */
  overallTrend: number | null;
  trendValues: number[];
}

export const POPULATION_DIMENSIONS = [
  'Age group',
  'Deprivation quintile',
  'Deprivation quintile - Age Standardised',
  'Ethnicity',
  'Ethnicity (broad)',
  'Learning Disability',
  'Mental Health',
  'Sex',
  'Sex - Age Standardised',
] as const;

export type PopulationDimension = typeof POPULATION_DIMENSIONS[number];

export interface PopulationVariationGroup {
  category: IndicatorCategoryData;
  label: string;
  value: number;
  isUnclassified: boolean;
  isHighlighted: boolean;
}

export interface PopulationVariationRow {
  indicator: IndicatorWithData;
  dimension: PopulationDimension;
  dimensionLabel: string;
  overallCategory: IndicatorCategoryData;
  overallValue: number;
  groups: PopulationVariationGroup[];
  mostUnfavourable: PopulationVariationGroup;
  gap: number;
  /** Positive means favourable; negative means unfavourable. Descriptive for recorded prevalence. */
  performanceGap: number;
  /** Whether the named-group difference clears the screening threshold. */
  isMaterialDifference: boolean;
  /** Difference expressed as multiples of the screening threshold. */
  variationScore: number;
  suppressedCount: number;
  isRecordedPrevalence: boolean;
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
      const isSuppressed = category.Data.Value === null && /suppress/i.test(category.Data.ValueNote ?? '');
      if (category.Data.Value === null && !isSuppressed) continue;
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

function isAgeStandardisedDimension(dimension: string) {
  return /Age Standardised/i.test(dimension);
}

function getOverallCategory(indicator: IndicatorWithData, dimension: PopulationDimension) {
  const type = isAgeStandardisedDimension(dimension) ? 'Sex - Age Standardised' : 'Sex';
  return indicator.Categories.find((category) => (
    category.MetricCategoryTypeName === type
    && category.MetricCategoryName === 'Persons'
    && category.Data.Value !== null
  ));
}

function isDimensionGroup(category: IndicatorCategoryData, dimension: PopulationDimension) {
  if (category.MetricCategoryTypeName !== dimension || category.MetricCategoryName === 'Persons') return false;
  if (dimension.startsWith('Sex')) return true;
  return !category.CategoryAttribute || category.CategoryAttribute === 'Persons';
}

function isUnclassifiedGroup(category: IndicatorCategoryData, dimension: PopulationDimension) {
  if (!dimension.startsWith('Ethnicity')) return false;
  return /^(missing|not stated|unknown|not known|not recorded)$/i.test(category.MetricCategoryName.trim());
}

function isPercentageFormat(formatDisplayName: string) {
  return /%|percent|proportion/i.test(formatDisplayName);
}

function variationThresholds(formatDisplayName: string, overallValue: number) {
  const scale = Math.max(Math.abs(overallValue), Number.EPSILON);
  if (isPercentageFormat(formatDisplayName)) {
    return {
      material: Math.max(1, scale * 0.05),
      equivalent: Math.max(COMPARISON_TOLERANCE, scale * 0.025),
    };
  }

  return { material: scale * 0.05, equivalent: scale * 0.025 };
}

export function buildPopulationVariationRows(
  indicators: IndicatorWithData[],
  selectedDimension: PopulationDimension | 'all' = 'all',
): PopulationVariationRow[] {
  return indicators.flatMap((indicator) => {
    const classification = classifyIndicator(indicator);
    const isRecordedPrevalence = classification.section.id === 'prevalence';
    const dimensions = selectedDimension === 'all' ? POPULATION_DIMENSIONS : [selectedDimension];
    const candidates = dimensions.flatMap((dimension): PopulationVariationRow[] => {
      const overallCategory = getOverallCategory(indicator, dimension);
      const overallValue = overallCategory?.Data.Value;
      if (!overallCategory || overallValue === null || overallValue === undefined) return [];

      const categories = indicator.Categories.filter((category) => isDimensionGroup(category, dimension));
      const groups = categories
        .filter((category) => category.Data.Value !== null)
        .map((category) => ({
          category,
          label: getMarkerLabel(category),
          value: category.Data.Value!,
          isUnclassified: isUnclassifiedGroup(category, dimension),
          isHighlighted: false,
        }));
      const comparableGroups = groups.filter((group) => !group.isUnclassified);
      if (comparableGroups.length < 2) return [];

      const selectedGroup = isRecordedPrevalence
        ? comparableGroups.reduce((selected, group) => (
          Math.abs(group.value - overallValue) > Math.abs(selected.value - overallValue) ? group : selected
        ))
        : comparableGroups.reduce((selected, group) => {
          if (classification.lowerIsBetter) return group.value > selected.value ? group : selected;
          return group.value < selected.value ? group : selected;
        });
      const gap = selectedGroup.value - overallValue;
      const performanceGap = classification.lowerIsBetter ? -gap : gap;
      const thresholds = variationThresholds(indicator.FormatDisplayName, overallValue);
      const materialDifference = isRecordedPrevalence
        ? Math.abs(gap) >= thresholds.material
        : performanceGap <= -thresholds.material;
      const groupsWithHighlights = groups.map((group) => {
        if (group.isUnclassified || !materialDifference) return group;
        const groupGap = group.value - overallValue;
        if (isRecordedPrevalence) {
          return {
            ...group,
            isHighlighted: Math.abs(groupGap) >= Math.abs(gap) - thresholds.equivalent,
          };
        }
        const groupPerformanceGap = classification.lowerIsBetter ? -groupGap : groupGap;
        return {
          ...group,
          isHighlighted: groupPerformanceGap <= performanceGap + thresholds.equivalent,
        };
      });
      const mostUnfavourable = groupsWithHighlights.find((group) => (
        group.category === selectedGroup.category
      ))!;
      const variationScore = (isRecordedPrevalence ? Math.abs(gap) : Math.max(0, -performanceGap))
        / thresholds.material;
      const suppressedCount = categories.filter((category) => (
        category.Data.Value === null && /suppress/i.test(category.Data.ValueNote ?? '')
      )).length;

      return [{
        indicator,
        dimension,
        dimensionLabel: getMarkerGroupLabel(dimension),
        overallCategory,
        overallValue,
        groups: groupsWithHighlights,
        mostUnfavourable,
        gap,
        performanceGap,
        isMaterialDifference: materialDifference,
        variationScore,
        suppressedCount,
        isRecordedPrevalence,
      }];
    });

    if (selectedDimension !== 'all' || candidates.length < 2) return candidates;
    return [candidates.reduce((largest, row) => (
      row.variationScore > largest.variationScore ? row : largest
    ))];
  });
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

export function countSuppressedCategories(
  indicators: IndicatorWithData[],
  marker: MarkerSelection,
): number {
  return indicators.reduce((count, indicator) => count + selectedCategories(indicator, marker)
    .filter((category) => category.Data.Value === null && /suppress/i.test(category.Data.ValueNote ?? ''))
    .length, 0);
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
          trendDirection: trend.latest?.direction ?? null,
          overallTrend: trend.latest?.change ?? null,
          trendValues: trend.values,
        };
      })
  ));
}
