import { NextResponse } from 'next/server';
import { findSectionForIndicator, isLowerBetterIndicator } from '@/lib/constants/indicator-sections';

const API_ORIGIN = 'https://api.cvdprevent.nhs.uk';
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';
const AGENT_VERSION = '5';
const PUBLIC_ORIGIN = 'https://www.cvdprevent-explorer.app';

type JsonObject = Record<string, unknown>;

export const maxDuration = 30;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
  };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function linkOrigin(requestUrl: URL) {
  return ['localhost', '127.0.0.1'].includes(requestUrl.hostname)
    ? requestUrl.origin
    : PUBLIC_ORIGIN;
}

function relayUrl(origin: string, path: string, params: Record<string, string | number>) {
  const url = new URL(`/api/cvdprevent/${path}`, origin);
  url.searchParams.set('agentVersion', AGENT_VERSION);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url.toString();
}

async function fetchUpstream(path: string) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`CVDPREVENT API returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

function areaDetails(payload: unknown) {
  if (!isObject(payload) || !isObject(payload.areaDetails)) return null;
  const area = payload.areaDetails;
  return {
    AreaID: area.AreaID,
    AreaCode: area.AreaCode,
    AreaName: area.AreaName,
    SystemLevelID: area.SystemLevelID,
    SystemLevelName: area.SystemLevelName,
  };
}

function indicatorRows(payload: unknown) {
  if (!isObject(payload) || !Array.isArray(payload.indicatorList)) return [];
  return payload.indicatorList.filter(isObject);
}

function personsCategory(indicator: JsonObject) {
  if (!Array.isArray(indicator.Categories)) return undefined;
  return indicator.Categories.find(category => isObject(category)
    && category.MetricCategoryTypeName === 'Sex'
    && category.MetricCategoryName === 'Persons') as JsonObject | undefined;
}

function numericValue(data: JsonObject | undefined) {
  return typeof data?.Value === 'number' ? data.Value : null;
}

function isPercentageIndicator(indicator: JsonObject) {
  return `${String(indicator.FormatDisplayName ?? '')} ${String(indicator.AxisCharacter ?? '')}`.includes('%');
}

function comparisonRule(indicator: JsonObject, subjectValue: number, comparisonValue: number) {
  if (isPercentageIndicator(indicator)) {
    return {
      similar: Math.abs(subjectValue - comparisonValue) <= 0.5,
      metadata: {
        Type: 'absolute tolerance',
        Tolerance: 0.5,
        Unit: 'percentage points',
        Note: 'Explorer display convention; not a statistical significance test.',
      },
    };
  }

  const decimalPlaces = Math.abs(subjectValue) < 1 || Math.abs(comparisonValue) < 1 ? 2 : 1;
  return {
    similar: subjectValue.toFixed(decimalPlaces) === comparisonValue.toFixed(decimalPlaces),
    metadata: {
      Type: 'published display equality',
      DecimalPlaces: decimalPlaces,
      Unit: 'value units',
      Note: 'Values are similar only when equal at the explorer display precision; not a statistical significance test.',
    },
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const timePeriodID = positiveInteger(requestUrl.searchParams.get('timePeriodID'));
  const areaID = positiveInteger(requestUrl.searchParams.get('areaID'));
  const comparisonAreaID = positiveInteger(requestUrl.searchParams.get('comparisonAreaID')) ?? 1;

  if (!timePeriodID || !areaID) {
    return NextResponse.json(
      { error: 'timePeriodID and areaID must be positive integers' },
      { status: 400, headers: corsHeaders() },
    );
  }

  try {
    const [subjectPayload, comparisonPayload, subjectDetails, comparisonDetails] = await Promise.all([
      fetchUpstream(`/indicator?timePeriodID=${timePeriodID}&areaID=${areaID}`),
      fetchUpstream(`/indicator?timePeriodID=${timePeriodID}&areaID=${comparisonAreaID}`),
      fetchUpstream(`/area/${areaID}/details?timePeriodID=${timePeriodID}`),
      fetchUpstream(`/area/${comparisonAreaID}/details?timePeriodID=${timePeriodID}`),
    ]);

    const origin = linkOrigin(requestUrl);
    const comparisonByCode = new Map(
      indicatorRows(comparisonPayload)
        .filter(indicator => typeof indicator.IndicatorCode === 'string')
        .map(indicator => [indicator.IndicatorCode as string, indicator]),
    );
    const counts = {
      subjectIndicators: 0,
      comparable: 0,
      missingComparison: 0,
      favourable: 0,
      similar: 0,
      unfavourable: 0,
      unclassified: 0,
      recordedPrevalence: { higher: 0, similar: 0, lower: 0 },
    };

    const indicators = indicatorRows(subjectPayload).flatMap((indicator) => {
      const subjectCategory = personsCategory(indicator);
      if (!subjectCategory || !isObject(subjectCategory.Data)) return [];
      counts.subjectIndicators++;

      const comparisonIndicator = typeof indicator.IndicatorCode === 'string'
        ? comparisonByCode.get(indicator.IndicatorCode)
        : undefined;
      const comparisonCategory = comparisonIndicator ? personsCategory(comparisonIndicator) : undefined;
      const comparisonData = comparisonCategory && isObject(comparisonCategory.Data)
        ? comparisonCategory.Data
        : undefined;
      const subjectValue = numericValue(subjectCategory.Data);
      const comparisonValue = numericValue(comparisonData);
      const difference = subjectValue !== null && comparisonValue !== null
        ? subjectValue - comparisonValue
        : null;
      const rule = difference === null
        ? null
        : comparisonRule(indicator, subjectValue!, comparisonValue!);
      const relation = difference === null
        ? 'missing comparison'
        : rule?.similar
          ? 'similar'
          : difference > 0
            ? 'higher'
            : 'lower';

      const indicatorCode = String(indicator.IndicatorCode ?? '');
      const section = findSectionForIndicator(indicatorCode);
      const lowerIsBetter = isLowerBetterIndicator(indicatorCode);
      const isRecordedPrevalence = section?.id === 'prevalence';
      const classificationSource = section ? 'mapped' : 'unclassified';
      let assessment: 'favourable' | 'similar' | 'unfavourable' | null = null;

      if (difference === null) {
        counts.missingComparison++;
      } else {
        counts.comparable++;
        if (isRecordedPrevalence) {
          counts.recordedPrevalence[relation as 'higher' | 'similar' | 'lower']++;
        } else if (classificationSource === 'unclassified') {
          counts.unclassified++;
        } else if (relation === 'similar') {
          assessment = 'similar';
          counts.similar++;
        } else {
          const favourable = lowerIsBetter ? relation === 'lower' : relation === 'higher';
          assessment = favourable ? 'favourable' : 'unfavourable';
          counts[assessment]++;
        }
      }

      const indicatorID = typeof indicator.IndicatorID === 'number' ? indicator.IndicatorID : undefined;
      const metadata = Object.fromEntries(Object.entries(indicator).filter(([key]) => key !== 'Categories'));

      return [{
        ...metadata,
        Section: section?.name ?? 'Unclassified',
        Polarity: isRecordedPrevalence
          ? 'recording measure'
          : classificationSource === 'unclassified'
            ? 'unclassified'
            : lowerIsBetter ? 'lower is better' : 'higher is better',
        ClassificationSource: classificationSource,
        ClassificationReason: section ? 'Maintained indicator mapping' : 'No maintained indicator mapping',
        Subject: subjectCategory.Data,
        Comparison: comparisonData ?? null,
        Difference: difference,
        DifferenceUnit: isPercentageIndicator(indicator) ? 'percentage points' : 'value units',
        SimilarityRule: rule?.metadata ?? null,
        Relation: relation,
        Assessment: assessment,
        _links: indicatorID === undefined ? undefined : {
          details: relayUrl(origin, `indicator/${indicatorID}/details`, {}),
          subjectData: relayUrl(origin, `indicator/${indicatorID}/data`, { timePeriodID, areaID }),
          comparisonData: relayUrl(origin, `indicator/${indicatorID}/data`, { timePeriodID, areaID: comparisonAreaID }),
        },
      }];
    });

    return NextResponse.json({
      TimePeriodID: timePeriodID,
      SubjectArea: areaDetails(subjectDetails),
      ComparisonArea: areaDetails(comparisonDetails),
      ComparisonRules: {
        percentageMeasures: 'Absolute differences at or below 0.5 percentage points are similar.',
        otherMeasures: 'Values are similar only when equal at the explorer display precision.',
        note: 'These are display conventions, not statistical significance tests.',
      },
      Counts: counts,
      Indicators: indicators,
      _links: {
        self: relayUrl(origin, 'summary', { timePeriodID, areaID, comparisonAreaID }),
        apiIndex: new URL(`/api/cvdprevent?agentVersion=${AGENT_VERSION}`, origin).toString(),
        skill: new URL('/skill.md', origin).toString(),
      },
    }, {
      headers: { ...corsHeaders(), 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    console.error('CVDPREVENT summary failed', error);
    return NextResponse.json(
      { error: 'CVDPREVENT API is unavailable' },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
