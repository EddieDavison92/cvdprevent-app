import { fetchApiNoCache } from '@/lib/api/client';
import { getLatestPeriod } from '@/lib/api/time-periods';
import { SYSTEM_LEVELS, type Indicator, type IndicatorResponse, type TimePeriod, type TimePeriodResponse } from '@/lib/api/types';
import { classifyIndicator, DASHBOARD_SECTIONS } from '@/lib/constants/indicator-sections';
import { CONDITION_PATHWAYS, findPathwayByIndicatorCode, getConditionFromCode } from '@/lib/constants/pathways';

export interface CatalogIndicator {
  code: string;
  name: string;
  shortName: string;
  release: 'standard' | 'outcome';
  section: string;
  polarity: 'lower' | 'higher';
  classification: 'mapped' | 'inferred' | 'unclassified';
  classificationReason: string;
  pathway: string | null;
  pathwayIsSuggested: boolean;
}

export interface CatalogPeriod {
  id: number;
  name: string;
  endDate: string;
}

export interface CatalogSnapshot {
  checkedAt: string;
  standardPeriod: CatalogPeriod;
  outcomePeriod: CatalogPeriod;
  indicators: CatalogIndicator[];
}

export interface CatalogChanges {
  standardReleaseChanged: boolean;
  outcomeReleaseChanged: boolean;
  newIndicators: CatalogIndicator[];
  removedIndicators: CatalogIndicator[];
  hasChanges: boolean;
}

const CURRENT_STANDARD_PERIOD: CatalogPeriod = {
  id: 33,
  name: 'To March 2026',
  endDate: '2026-03-31T00:00:00.000Z',
};

const CURRENT_OUTCOME_PERIOD: CatalogPeriod = {
  id: 32,
  name: 'Jan 2025 - Dec 2025',
  endDate: '2026-03-31T00:00:00.000Z',
};

function toCatalogPeriod(period: TimePeriod): CatalogPeriod {
  return {
    id: period.TimePeriodID,
    name: period.TimePeriodName,
    endDate: new Date(period.EndDate).toISOString(),
  };
}

function suggestedPathway(indicator: Indicator) {
  const mapped = findPathwayByIndicatorCode(indicator.IndicatorCode);
  if (mapped) return { name: mapped.name, suggested: false };

  const condition = getConditionFromCode(indicator.IndicatorCode);
  const inferred = CONDITION_PATHWAYS.find(pathway => pathway.id === condition);
  return inferred ? { name: inferred.name, suggested: true } : null;
}

function toCatalogIndicator(indicator: Indicator, release: 'standard' | 'outcome'): CatalogIndicator {
  const classification = classifyIndicator(indicator);
  const pathway = suggestedPathway(indicator);
  return {
    code: indicator.IndicatorCode,
    name: indicator.IndicatorName,
    shortName: indicator.IndicatorShortName,
    release,
    section: classification.section.name,
    polarity: classification.lowerIsBetter ? 'lower' : 'higher',
    classification: classification.source,
    classificationReason: classification.reason,
    pathway: pathway?.name ?? null,
    pathwayIsSuggested: pathway?.suggested ?? false,
  };
}

async function fetchIndicators(periodId: number) {
  const response = await fetchApiNoCache<IndicatorResponse>(
    `/indicator/list?timePeriodID=${periodId}&systemLevelID=${SYSTEM_LEVELS.ENGLAND}`,
    'indicatorList',
  );
  return response.indicatorList;
}

export async function fetchCatalogSnapshot(): Promise<CatalogSnapshot> {
  const periodResponse = await fetchApiNoCache<TimePeriodResponse>('/timePeriod', 'timePeriodList');
  const standardPeriod = getLatestPeriod(periodResponse.timePeriodList, 'standard');
  const outcomePeriod = getLatestPeriod(periodResponse.timePeriodList, 'outcome');
  if (!standardPeriod || !outcomePeriod) throw new Error('Latest CVDPREVENT periods were not found');

  const [standardIndicators, outcomeIndicators] = await Promise.all([
    fetchIndicators(standardPeriod.TimePeriodID),
    fetchIndicators(outcomePeriod.TimePeriodID),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    standardPeriod: toCatalogPeriod(standardPeriod),
    outcomePeriod: toCatalogPeriod(outcomePeriod),
    indicators: [
      ...standardIndicators.map(indicator => toCatalogIndicator(indicator, 'standard')),
      ...outcomeIndicators.map(indicator => toCatalogIndicator(indicator, 'outcome')),
    ].sort((a, b) => a.code.localeCompare(b.code)),
  };
}

export function getInitialCatalogSnapshot(): CatalogSnapshot {
  return {
    checkedAt: '2026-08-30T00:00:00.000Z',
    standardPeriod: CURRENT_STANDARD_PERIOD,
    outcomePeriod: CURRENT_OUTCOME_PERIOD,
    indicators: DASHBOARD_SECTIONS.flatMap(section => section.indicatorCodes.map(code => ({
      code,
      name: code,
      shortName: code,
      release: section.id === 'outcomes' ? 'outcome' as const : 'standard' as const,
      section: section.name,
      polarity: section.lowerIsBetter ? 'lower' as const : 'higher' as const,
      classification: 'mapped' as const,
      classificationReason: 'Maintained indicator mapping',
      pathway: findPathwayByIndicatorCode(code)?.name ?? null,
      pathwayIsSuggested: false,
    }))).sort((a, b) => a.code.localeCompare(b.code)),
  };
}

export function diffCatalogSnapshots(previous: CatalogSnapshot, current: CatalogSnapshot): CatalogChanges {
  const previousByCode = new Map(previous.indicators.map(indicator => [indicator.code, indicator]));
  const currentByCode = new Map(current.indicators.map(indicator => [indicator.code, indicator]));
  const newIndicators = current.indicators.filter(indicator => !previousByCode.has(indicator.code));
  const removedIndicators = previous.indicators.filter(indicator => !currentByCode.has(indicator.code));
  const standardReleaseChanged = previous.standardPeriod.id !== current.standardPeriod.id;
  const outcomeReleaseChanged = previous.outcomePeriod.id !== current.outcomePeriod.id;

  return {
    standardReleaseChanged,
    outcomeReleaseChanged,
    newIndicators,
    removedIndicators,
    hasChanges: standardReleaseChanged || outcomeReleaseChanged || newIndicators.length > 0 || removedIndicators.length > 0,
  };
}

export function formatCatalogAlert(previous: CatalogSnapshot, current: CatalogSnapshot, changes: CatalogChanges) {
  const lines = [
    'The weekly CVDPREVENT catalog check found a change.',
    '',
  ];

  if (changes.standardReleaseChanged) {
    lines.push(`Standard release: ${previous.standardPeriod.name} → ${current.standardPeriod.name}`);
  }
  if (changes.outcomeReleaseChanged) {
    lines.push(`Outcome release: ${previous.outcomePeriod.name} → ${current.outcomePeriod.name}`);
  }
  if (changes.newIndicators.length > 0) {
    lines.push('', `New indicators (${changes.newIndicators.length}):`);
    for (const indicator of changes.newIndicators) {
      const pathway = indicator.pathway
        ? `; pathway ${indicator.pathway}${indicator.pathwayIsSuggested ? ' (suggested)' : ''}`
        : '; no pathway match';
      lines.push(`- ${indicator.code}: ${indicator.shortName}`);
      lines.push(`  ${indicator.section}; ${indicator.polarity} is better; ${indicator.classification}${pathway}`);
    }
  }
  if (changes.removedIndicators.length > 0) {
    lines.push('', `Removed indicators (${changes.removedIndicators.length}):`);
    for (const indicator of changes.removedIndicators) lines.push(`- ${indicator.code}: ${indicator.shortName}`);
  }

  lines.push('', `Checked: ${current.checkedAt}`, 'Explorer: https://cvdprevent-explorer.app');
  return lines.join('\n');
}

export function catalogChangeKey(snapshot: CatalogSnapshot) {
  const codes = snapshot.indicators.map(indicator => indicator.code).join('-');
  let hash = 2166136261;
  for (const char of `${snapshot.standardPeriod.id}:${snapshot.outcomePeriod.id}:${codes}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `catalog-${(hash >>> 0).toString(16)}`;
}
