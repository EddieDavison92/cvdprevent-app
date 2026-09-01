import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import {
  classifyIndicator,
  type DashboardSection,
} from '@/lib/constants/indicator-sections';
import { summariseTrend, type TrendDirection } from '@/lib/utils/trend';

export type FocusPeerBand = 'worst' | 'second-worst';

export interface FocusSignal {
  indicator: IndicatorWithData;
  category: IndicatorCategoryData;
  baselineCategory: IndicatorCategoryData | null;
  value: number;
  baselineValue: number | null;
  gap: number | null;
  trend: number | null;
  trendDirection: TrendDirection | null;
  trendValues: number[];
  section: DashboardSection;
  lowerIsBetter: boolean;
  isRecordedPrevalence: boolean;
  usesAgeStandardised: boolean;
  peerBand: FocusPeerBand;
  comparisonIsClear: boolean;
  deteriorating: boolean;
  peerSeverity: number;
}

function isPersons(category: IndicatorCategoryData) {
  return category.MetricCategoryName === 'Persons' || category.CategoryAttribute === 'Persons';
}

function findPersonsCategory(indicator: IndicatorWithData, ageStandardised: boolean) {
  return indicator.Categories.find(category => (
    isPersons(category)
    && category.MetricCategoryTypeName === (ageStandardised ? 'Sex - Age Standardised' : 'Sex')
    && category.Data.Value !== null
  ));
}

function matchingCategory(
  indicator: IndicatorWithData | undefined,
  category: IndicatorCategoryData,
) {
  if (!indicator) return null;
  return indicator.Categories.find(candidate => (
    candidate.MetricCategoryTypeName === category.MetricCategoryTypeName
    && candidate.MetricCategoryName === category.MetricCategoryName
    && candidate.CategoryAttribute === category.CategoryAttribute
    && candidate.Data.Value !== null
  )) ?? null;
}

function selectCategories(
  indicator: IndicatorWithData,
  baselineIndicator: IndicatorWithData | undefined,
  isRecordedPrevalence: boolean,
) {
  const ageStandardised = findPersonsCategory(indicator, true);
  const baselineAgeStandardised = ageStandardised
    ? matchingCategory(baselineIndicator, ageStandardised)
    : null;

  // Crude recorded prevalence is heavily affected by population age structure.
  if (isRecordedPrevalence) {
    return ageStandardised
      ? { category: ageStandardised, baselineCategory: baselineAgeStandardised, usesAgeStandardised: true }
      : null;
  }

  if (ageStandardised && baselineAgeStandardised) {
    return {
      category: ageStandardised,
      baselineCategory: baselineAgeStandardised,
      usesAgeStandardised: true,
    };
  }

  const crude = findPersonsCategory(indicator, false);
  if (!crude) return null;
  return {
    category: crude,
    baselineCategory: matchingCategory(baselineIndicator, crude),
    usesAgeStandardised: false,
  };
}

function isUnfavourable(value: number, reference: number, lowerIsBetter: boolean) {
  return lowerIsBetter ? value > reference : value < reference;
}

function confidenceIntervalsDoNotOverlap(
  category: IndicatorCategoryData,
  baselineCategory: IndicatorCategoryData,
) {
  const areaLower = category.Data.LowerConfidenceLimit;
  const areaUpper = category.Data.UpperConfidenceLimit;
  const baselineLower = baselineCategory.Data.LowerConfidenceLimit;
  const baselineUpper = baselineCategory.Data.UpperConfidenceLimit;
  if ([areaLower, areaUpper, baselineLower, baselineUpper].some(value => value === null)) return false;
  return areaUpper! < baselineLower! || baselineUpper! < areaLower!;
}

function getPeerEvidence(
  category: IndicatorCategoryData,
  lowerIsBetter: boolean,
) {
  const value = category.Data.Value;
  const { Median: median, Q20: q20, Q40: q40, Q60: q60, Q80: q80 } = category.Data;
  if (value === null || median === null || [q20, q40, q60, q80].some(boundary => boundary === null)) {
    return { band: null, severity: 0 };
  }

  let band: FocusPeerBand | null = null;
  if (lowerIsBetter) {
    if (value > q80!) band = 'worst';
    else if (value > q60!) band = 'second-worst';
  } else {
    if (value < q20!) band = 'worst';
    else if (value < q40!) band = 'second-worst';
  }

  const peerSpan = Math.abs(q80! - q20!);
  const severity = peerSpan === 0
    ? 0
    : Math.max(0, lowerIsBetter ? (value - median) / peerSpan : (median - value) / peerSpan);
  return { band, severity };
}

function getTrend(category: IndicatorCategoryData, lowerIsBetter: boolean) {
  const values = category.TimeSeries
    .slice()
    .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime())
    .map(point => point.Value);
  const summary = summariseTrend(values);
  const direction = summary.latest?.direction ?? null;
  const deteriorating = direction !== null
    && direction !== 'flat'
    && (lowerIsBetter ? direction === 'up' : direction === 'down');
  return {
    change: summary.latest?.change ?? null,
    direction,
    deteriorating,
    values: summary.values,
  };
}

export function buildFocusSignals(
  indicators: IndicatorWithData[],
  baselineIndicators: IndicatorWithData[],
  maxItems = 5,
): FocusSignal[] {
  const baselineMap = new Map(baselineIndicators.map(indicator => [indicator.IndicatorCode, indicator]));
  const signals: FocusSignal[] = [];

  for (const indicator of indicators) {
    const classification = classifyIndicator(indicator);
    if (classification.section.id === 'other') continue;

    const isRecordedPrevalence = classification.section.id === 'prevalence';
    const selection = selectCategories(
      indicator,
      baselineMap.get(indicator.IndicatorCode),
      isRecordedPrevalence,
    );
    if (!selection) continue;

    const { category, baselineCategory, usesAgeStandardised } = selection;
    const value = category.Data.Value;
    if (value === null) continue;
    const baselineValue = baselineCategory?.Data.Value ?? null;
    const peer = getPeerEvidence(category, classification.lowerIsBetter);
    if (peer.band === null) continue;

    const comparisonIsClear = Boolean(baselineCategory && baselineValue !== null
      && isUnfavourable(value, baselineValue, classification.lowerIsBetter)
      && confidenceIntervalsDoNotOverlap(category, baselineCategory));
    const trend = getTrend(category, classification.lowerIsBetter);

    // Recorded prevalence is a possible detection signal, not a direct measure
    // of care quality. Only promote it when its age-standardised rate is in the
    // worst peer fifth.
    if (isRecordedPrevalence && peer.band !== 'worst') continue;

    signals.push({
      indicator,
      category,
      baselineCategory,
      value,
      baselineValue,
      gap: baselineValue === null ? null : value - baselineValue,
      trend: trend.change,
      trendDirection: trend.direction,
      trendValues: trend.values,
      section: classification.section,
      lowerIsBetter: classification.lowerIsBetter,
      isRecordedPrevalence,
      usesAgeStandardised,
      peerBand: peer.band,
      comparisonIsClear,
      deteriorating: trend.deteriorating,
      peerSeverity: peer.severity,
    });
  }

  return signals
    .sort((a, b) => (
      (a.peerBand === b.peerBand ? 0 : a.peerBand === 'worst' ? -1 : 1)
      || b.peerSeverity - a.peerSeverity
      || a.indicator.IndicatorCode.localeCompare(b.indicator.IndicatorCode)
    ))
    .slice(0, maxItems);
}
