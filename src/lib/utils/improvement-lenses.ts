import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import { getPersonsData } from '@/lib/hooks/use-area-indicators';
import { buildImprovementRows, type ImprovementRow } from '@/lib/utils/improvement-rows';
import {
  getMarkerLabel,
  POPULATION_DIMENSIONS,
  type PopulationDimension,
} from '@/lib/utils/quality-improvement';

export type Lens = 'opportunity' | 'position' | 'inequalities' | 'within';
/** Peer median, best fifth of peers, or `area:<id>` for an area above this one. */
export type OpportunityTarget = 'median' | 'top' | `area:${number}`;

export interface LensRow extends ImprovementRow {
  metricId: number;
  timePeriodId: number;
  numerator: number | null;
  denominator: number | null;
  isPercentage: boolean;
  /** Favourable-direction boundary of the best fifth of peers. */
  topFifth: number | null;
  /** Q80 minus Q20 among peers. */
  spread: number | null;
  spreadIsWide: boolean;
  /** Estimated share of peers this area does better than, 0–100. */
  position: number | null;
  /** Latest change with favourable direction positive. */
  favourableChange: number | null;
  /** Favourable change as a share of the peer spread. */
  movement: number | null;
  /** Value and peer median per period, oldest first, aligned. */
  series: Array<number | null>;
  medianSeries: Array<number | null>;
  /** Favourable gap to the peer median per period. */
  gapSeries: Array<number | null>;
  gapNow: number | null;
  /** Change in the gap over up to four periods. Positive means closing. */
  gapChange: number | null;
  gapDirection: 'closing' | 'widening' | 'steady' | null;
  opportunity: Opportunity | null;
}

export interface Opportunity {
  /** Extra patients if the area matched each comparator. Null when the comparator is unavailable. */
  toMedian: number | null;
  toTop: number | null;
  gapToMedian: number | null;
  gapToTop: number | null;
  /** Patients currently counted in the numerator; meaningful for detection gaps. */
  flagged: number | null;
}

export interface BuildLensRowsOptions {
  includePeers?: boolean;
}

const OPPORTUNITY_STAGES = new Set(['detection', 'treatment', 'control', 'monitoring']);

function sortedSeries(category: IndicatorCategoryData) {
  return category.TimeSeries
    .slice()
    .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime());
}

/** Piecewise-linear percentile from the published quintile boundaries. */
export function estimatePosition(
  value: number,
  bounds: { min: number | null; q20: number | null; q40: number | null; median: number | null; q60: number | null; q80: number | null; max: number | null },
  lowerIsBetter: boolean,
): number | null {
  const edges = [bounds.min, bounds.q20, bounds.q40, bounds.median, bounds.q60, bounds.q80, bounds.max];
  if (edges.some((edge) => edge === null)) return null;
  const marks = [0, 20, 40, 50, 60, 80, 100];
  let percentile = 100;
  for (let i = 0; i < edges.length - 1; i += 1) {
    const lower = edges[i]!;
    const upper = edges[i + 1]!;
    if (value <= upper) {
      const fraction = upper === lower ? 0 : (value - lower) / (upper - lower);
      percentile = marks[i] + Math.max(0, Math.min(1, fraction)) * (marks[i + 1] - marks[i]);
      break;
    }
  }
  return Math.round(lowerIsBetter ? 100 - percentile : percentile);
}

function patients(gapPp: number | null, denominator: number | null) {
  if (gapPp === null || denominator === null || gapPp <= 0) return gapPp === null ? null : 0;
  return Math.round((gapPp / 100) * denominator);
}

export function buildLensRows(
  indicators: IndicatorWithData[],
  { includePeers = true }: BuildLensRowsOptions = {},
): LensRow[] {
  return buildImprovementRows(indicators, { includePeers }).map((row) => {
    const category = getPersonsData(row.indicator)!;
    const data = category.Data;
    const isPercentage = row.indicator.FormatDisplayName.includes('%');
    const points = sortedSeries(category);
    const series = points.map((point) => point.Value);
    const medianSeries = points.map((point) => point.Median ?? null);
    const gapSeries = points.map((point) => (
      point.Value === null || point.Median === null || point.Median === undefined
        ? null
        : row.lowerIsBetter ? point.Median - point.Value : point.Value - point.Median
    ));
    const gaps = gapSeries.filter((gap): gap is number => gap !== null);
    const gapNow = gaps.length ? gaps[gaps.length - 1] : null;
    const gapChange = gaps.length >= 2 ? gapNow! - gaps[Math.max(0, gaps.length - 5)] : null;
    const gapTolerance = isPercentage ? 0.1 : Math.abs(gapNow ?? 0) * 0.02;
    const gapDirection = gapChange === null
      ? null
      : gapChange > gapTolerance ? 'closing' : gapChange < -gapTolerance ? 'widening' : 'steady';

    const peer = row.peer;
    const topFifth = peer ? (row.lowerIsBetter ? data.Q20 : data.Q80) : null;
    const spread = peer && data.Q80 !== null && data.Q20 !== null ? data.Q80 - data.Q20 : null;
    const spreadIsWide = spread !== null && (spread >= 10 || spread / Math.max(Math.abs(row.value), 0.01) >= 0.25);
    const position = peer
      ? estimatePosition(row.value, { min: data.Min, q20: data.Q20, q40: data.Q40, median: data.Median, q60: data.Q60, q80: data.Q80, max: data.Max }, row.lowerIsBetter)
      : null;
    const favourableChange = row.trend.change === null
      ? null
      : row.lowerIsBetter ? -row.trend.change : row.trend.change;
    const movement = favourableChange !== null && spread ? favourableChange / spread : null;

    let opportunity: Opportunity | null = null;
    if (isPercentage && OPPORTUNITY_STAGES.has(row.section.id)) {
      const favourableGap = (target: number | null) => (
        target === null ? null : row.lowerIsBetter ? row.value - target : target - row.value
      );
      const gapToMedian = favourableGap(peer?.median ?? null);
      const gapToTop = favourableGap(topFifth);
      opportunity = {
        toMedian: patients(gapToMedian, data.Denominator),
        toTop: patients(gapToTop, data.Denominator),
        gapToMedian,
        gapToTop,
        flagged: row.section.id === 'detection' ? data.Numerator : null,
      };
    }

    return {
      ...row,
      metricId: category.MetricID,
      timePeriodId: data.TimePeriodID,
      numerator: data.Numerator,
      denominator: data.Denominator,
      isPercentage,
      topFifth,
      spread,
      spreadIsWide,
      position,
      favourableChange,
      movement,
      series,
      medianSeries,
      gapSeries,
      gapNow,
      gapChange,
      gapDirection,
      opportunity,
    };
  });
}

/** Extra patients and gap if the area matched a comparator area's rate. */
export function opportunityAgainst(row: LensRow, comparatorValue: number | null | undefined) {
  if (!row.opportunity || comparatorValue === null || comparatorValue === undefined) return { patients: null, gap: null };
  const gap = row.lowerIsBetter ? row.value - comparatorValue : comparatorValue - row.value;
  return { patients: patients(gap, row.denominator), gap };
}

export function opportunityFor(row: LensRow, target: OpportunityTarget, comparatorValues?: Map<string, number>) {
  if (!row.opportunity) return { patients: null, gap: null };
  const { opportunity } = row;
  if (target === 'top') return { patients: opportunity.toTop, gap: opportunity.gapToTop };
  if (target.startsWith('area:')) return opportunityAgainst(row, comparatorValues?.get(row.indicator.IndicatorCode));
  return { patients: opportunity.toMedian, gap: opportunity.gapToMedian };
}

/* ---------- Inequalities ---------- */

export interface GroupCell {
  label: string;
  value: number | null;
  /** Difference from the all-patient result with favourable direction positive. */
  diff: number | null;
  suppressed: boolean;
  isUnclassified: boolean;
  order: number;
}

export interface GroupRow {
  row: LensRow;
  overallValue: number;
  cells: GroupCell[];
  /** Largest unfavourable difference among classified groups. */
  worstDiff: number | null;
  /** Last ordered group minus first, favourable sign; only for ordered dimensions. */
  gradient: number | null;
  /** Spread between the best and worst classified group. */
  range: number | null;
}

export const ORDERED_DIMENSIONS = new Set<PopulationDimension>([
  'Deprivation quintile',
  'Deprivation quintile - Age Standardised',
  'Age group',
]);

const UNCLASSIFIED = /^(missing|not stated|unknown|not known|not recorded)$/i;

function overallCategory(indicator: IndicatorWithData, dimension: PopulationDimension) {
  const type = /Age Standardised/i.test(dimension) ? 'Sex - Age Standardised' : 'Sex';
  return indicator.Categories.find((category) => (
    category.MetricCategoryTypeName === type && category.MetricCategoryName === 'Persons' && category.Data.Value !== null
  ));
}

export function buildGroupRows(rows: LensRow[], dimension: PopulationDimension): GroupRow[] {
  return rows.flatMap((row) => {
    const overall = overallCategory(row.indicator, dimension);
    const overallValue = overall?.Data.Value;
    if (!overall || overallValue === null || overallValue === undefined) return [];

    const cells = row.indicator.Categories
      .filter((category) => (
        category.MetricCategoryTypeName === dimension
        && category.MetricCategoryName !== 'Persons'
        && (dimension.startsWith('Sex') || !category.CategoryAttribute || category.CategoryAttribute === 'Persons')
      ))
      .sort((a, b) => a.MetricCategoryOrder - b.MetricCategoryOrder)
      .map((category): GroupCell => {
        const value = category.Data.Value;
        const suppressed = value === null && /suppress/i.test(category.Data.ValueNote ?? '');
        const raw = value === null ? null : value - overallValue;
        return {
          label: getMarkerLabel(category),
          value,
          diff: raw === null ? null : row.lowerIsBetter ? -raw : raw,
          suppressed,
          isUnclassified: dimension.startsWith('Ethnicity') && UNCLASSIFIED.test(category.MetricCategoryName.trim()),
          order: category.MetricCategoryOrder,
        };
      })
      .filter((cell) => cell.value !== null || cell.suppressed);

    const classified = cells.filter((cell) => !cell.isUnclassified && cell.diff !== null);
    if (classified.length < 2) return [];
    const diffs = classified.map((cell) => cell.diff!);
    const worstDiff = Math.min(...diffs);
    const range = Math.max(...diffs) - worstDiff;
    const gradient = ORDERED_DIMENSIONS.has(dimension)
      ? classified[classified.length - 1].diff! - classified[0].diff!
      : null;

    return [{ row, overallValue, cells, worstDiff: worstDiff < 0 ? worstDiff : 0, gradient, range }];
  });
}

export const INEQUALITY_DIMENSIONS: PopulationDimension[] = POPULATION_DIMENSIONS.filter(
  (dimension) => !/Age Standardised/i.test(dimension),
);
