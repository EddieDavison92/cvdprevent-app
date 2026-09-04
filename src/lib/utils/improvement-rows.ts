import type { IndicatorWithData } from '@/lib/api/types';
import { classifyIndicator, type DashboardSection } from '@/lib/constants/indicator-sections';
import { getPeerBand, type FocusPeerBand } from '@/lib/utils/focus-signals';
import {
  assessQualityImprovementRow,
  buildPopulationVariationRows,
  buildQualityImprovementRows,
  type PerformanceStatus,
  type PopulationVariationRow,
  type QualityImprovementAssessment,
} from '@/lib/utils/quality-improvement';
import type { TrendDirection } from '@/lib/utils/trend';

/**
 * Signals that put an indicator on the improvement shortlist.
 * - peers: behind the peer median (care measures only)
 * - deteriorating: latest change moved in the unfavourable direction
 * - variation: a patient group is materially behind the all-patient result
 * - detection: recorded prevalence is below the peer median
 */
export type ImprovementSignal = 'peers' | 'deteriorating' | 'variation' | 'detection';

export const IMPROVEMENT_SIGNALS: ImprovementSignal[] = ['peers', 'deteriorating', 'variation', 'detection'];

export interface ImprovementPeerPosition {
  median: number;
  min: number | null;
  max: number | null;
  quintileBounds: Array<number | null>;
  status: PerformanceStatus;
  /** Raw difference from the median. */
  gap: number;
  /** Positive means favourable. */
  performanceGap: number;
  band: FocusPeerBand | null;
  /** Gap as a share of the peer interquintile span; used for ranking. */
  severity: number;
}

export interface ImprovementTrend {
  values: number[];
  change: number | null;
  direction: TrendDirection | null;
  status: QualityImprovementAssessment['trendStatus'];
}

export interface ImprovementRow {
  indicator: IndicatorWithData;
  section: DashboardSection;
  lowerIsBetter: boolean;
  isRecordedPrevalence: boolean;
  value: number;
  peer: ImprovementPeerPosition | null;
  trend: ImprovementTrend;
  variation: PopulationVariationRow | null;
  signals: ImprovementSignal[];
}

export type ImprovementSort = 'priority' | 'peer' | 'change' | 'variation' | 'name';

export interface BuildImprovementRowsOptions {
  /** England has no peer set, so peer-based signals are skipped. */
  includePeers?: boolean;
}

export function buildImprovementRows(
  indicators: IndicatorWithData[],
  { includePeers = true }: BuildImprovementRowsOptions = {},
): ImprovementRow[] {
  const variationByIndicator = new Map(
    buildPopulationVariationRows(indicators, 'all').map((row) => [row.indicator.IndicatorID, row]),
  );

  return buildQualityImprovementRows(indicators, 'persons').map((row) => {
    const classification = classifyIndicator(row.indicator);
    const isRecordedPrevalence = classification.section.id === 'prevalence';
    const assessment = assessQualityImprovementRow(row);
    const variation = variationByIndicator.get(row.indicator.IndicatorID) ?? null;

    let peer: ImprovementPeerPosition | null = null;
    if (includePeers && row.median !== null && assessment.gap !== null && assessment.performanceGap !== null) {
      const evidence = getPeerBand(row.category, classification.lowerIsBetter);
      peer = {
        median: row.median,
        min: row.min,
        max: row.max,
        quintileBounds: [row.category.Data.Q20, row.category.Data.Q40, row.category.Data.Q60, row.category.Data.Q80],
        status: assessment.status,
        gap: assessment.gap,
        performanceGap: assessment.performanceGap,
        band: evidence.band,
        severity: evidence.severity,
      };
    }

    const signals: ImprovementSignal[] = [];
    if (peer?.status === 'unfavourable') signals.push('peers');
    if (assessment.trendStatus === 'deteriorating') signals.push('deteriorating');
    if (variation?.isMaterialDifference && !isRecordedPrevalence) signals.push('variation');
    if (isRecordedPrevalence && peer && peer.gap < 0 && peer.band !== null) signals.push('detection');

    return {
      indicator: row.indicator,
      section: classification.section,
      lowerIsBetter: classification.lowerIsBetter,
      isRecordedPrevalence,
      value: row.value,
      peer,
      trend: {
        values: row.trendValues,
        change: row.trend,
        direction: row.trendDirection,
        status: assessment.trendStatus,
      },
      variation,
      signals,
    };
  });
}

function bandRank(band: FocusPeerBand | null) {
  return band === 'worst' ? 0 : band === 'second-worst' ? 1 : 2;
}

function peerDeficit(row: ImprovementRow) {
  if (!row.peer) return 0;
  return Math.max(0, -row.peer.performanceGap);
}

function unfavourableChange(row: ImprovementRow) {
  if (row.trend.change === null || row.isRecordedPrevalence) return 0;
  const signed = row.lowerIsBetter ? row.trend.change : -row.trend.change;
  return Math.max(0, signed);
}

function variationScore(row: ImprovementRow) {
  return row.variation && !row.isRecordedPrevalence ? row.variation.variationScore : 0;
}

/** Ranks rows so the strongest signals come first. */
export function compareImprovementRows(a: ImprovementRow, b: ImprovementRow, sort: ImprovementSort): number {
  const byName = () => a.indicator.IndicatorShortName.localeCompare(b.indicator.IndicatorShortName);
  switch (sort) {
    case 'name':
      return byName();
    case 'peer':
      return bandRank(a.peer?.band ?? null) - bandRank(b.peer?.band ?? null)
        || (b.peer?.severity ?? 0) - (a.peer?.severity ?? 0)
        || byName();
    case 'change':
      return unfavourableChange(b) - unfavourableChange(a)
        || Math.abs(b.trend.change ?? 0) - Math.abs(a.trend.change ?? 0)
        || byName();
    case 'variation':
      return variationScore(b) - variationScore(a) || byName();
    case 'priority':
    default:
      return b.signals.length - a.signals.length
        || bandRank(a.peer?.band ?? null) - bandRank(b.peer?.band ?? null)
        || (b.peer?.severity ?? 0) - (a.peer?.severity ?? 0)
        || peerDeficit(b) - peerDeficit(a)
        || unfavourableChange(b) - unfavourableChange(a)
        || variationScore(b) - variationScore(a)
        || byName();
  }
}

export function countImprovementSignals(rows: ImprovementRow[]): Record<ImprovementSignal, number> {
  const counts: Record<ImprovementSignal, number> = { peers: 0, deteriorating: 0, variation: 0, detection: 0 };
  for (const row of rows) for (const signal of row.signals) counts[signal] += 1;
  return counts;
}
