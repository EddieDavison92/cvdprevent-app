import { NextResponse } from 'next/server';

const API_ORIGIN = 'https://api.cvdprevent.nhs.uk';
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';
const AGENT_VERSION = '3';
const PUBLIC_ORIGIN = 'https://cvdprevent-explorer.app';

const JSON_PATHS = [
  /^timePeriod(?:\/systemLevels)?$/,
  /^area$/,
  /^area\/(?:systemLevel(?:\/timePeriods)?|unassigned|search)$/,
  /^area\/\d+\/(?:details|nestedSubSystems|flatSubSystems)$/,
  /^indicator$/,
  /^indicator\/(?:list|metricList|tags|priorityGroups|siblingData|childData)$/,
  /^indicator\/(?:pathwayGroup|indicatorGroup)\/\d+$/,
  /^indicator\/\d+\/(?:details|data|rawDataJSON)$/,
  /^indicator\/(?:nationalVsAreaMetricData|timeSeriesByMetric|personsTimeSeriesByIndicator|metricSystemLevelComparison|metricAreaBreakdown)\/\d+$/,
  /^externalResource$/,
  /^dataAvailability$/,
];

type JsonObject = Record<string, unknown>;
type RouteContext = { params: Promise<{ path: string[] }> };

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

function numberField(object: JsonObject, key: string) {
  const value = object[key];
  return typeof value === 'number' ? value : undefined;
}

function linkOrigin(requestUrl: URL) {
  return ['localhost', '127.0.0.1'].includes(requestUrl.hostname)
    ? requestUrl.origin
    : PUBLIC_ORIGIN;
}

function relayUrl(origin: string, path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`/api/cvdprevent/${path}`, origin);
  url.searchParams.set('agentVersion', AGENT_VERSION);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function areaLinks(origin: string, area: JsonObject, timePeriodID?: number, inheritedSystemLevelID?: number) {
  const areaID = numberField(area, 'AreaID');
  const systemLevelID = numberField(area, 'SystemLevelID') ?? inheritedSystemLevelID;
  if (areaID === undefined || timePeriodID === undefined) return;

  area._links = {
    details: relayUrl(origin, `area/${areaID}/details`, { timePeriodID }),
    indicatorList: systemLevelID === undefined
      ? undefined
      : relayUrl(origin, 'indicator/list', { timePeriodID, systemLevelID, areaID }),
    allIndicatorsLarge: relayUrl(origin, 'indicator', { timePeriodID, areaID }),
  };
}

function metricLinks(origin: string, category: JsonObject, timePeriodID?: number, areaID?: number) {
  const metricID = numberField(category, 'MetricID');
  if (metricID === undefined || timePeriodID === undefined || areaID === undefined) return;

  category._links = {
    trend: relayUrl(origin, `indicator/timeSeriesByMetric/${metricID}`, { areaID }),
    geographicPeers: relayUrl(origin, 'indicator/siblingData', { timePeriodID, areaID, metricID }),
    immediateChildren: relayUrl(origin, 'indicator/childData', { timePeriodID, areaID, metricID }),
    areaBreakdown: relayUrl(origin, `indicator/metricAreaBreakdown/${metricID}`, { timePeriodID, areaID }),
    systemLevelComparison: relayUrl(origin, `indicator/metricSystemLevelComparison/${metricID}`, { timePeriodID, areaID }),
    nationalAndArea: relayUrl(origin, `indicator/nationalVsAreaMetricData/${metricID}`, { timePeriodID, areaID }),
  };
}

function indicatorLinks(
  origin: string,
  indicator: JsonObject,
  timePeriodID?: number,
  systemLevelID?: number,
  areaID?: number,
  includeAllMetricLinks = false,
) {
  const indicatorID = numberField(indicator, 'IndicatorID');
  if (indicatorID === undefined) return;

  indicator._links = {
    details: relayUrl(origin, `indicator/${indicatorID}/details`),
    data: timePeriodID === undefined || areaID === undefined
      ? undefined
      : relayUrl(origin, `indicator/${indicatorID}/data`, { timePeriodID, areaID }),
    rawDataAtSystemLevel: timePeriodID === undefined || systemLevelID === undefined
      ? undefined
      : relayUrl(origin, `indicator/${indicatorID}/rawDataJSON`, { timePeriodID, systemLevelID }),
    rawPersonsDataAtSystemLevel: timePeriodID === undefined || systemLevelID === undefined
      ? undefined
      : relayUrl(origin, `indicator/${indicatorID}/rawDataJSON`, {
        timePeriodID,
        systemLevelID,
        metricCategoryTypeName: 'Sex',
        metricCategoryName: 'Persons',
      }),
    dataAvailability: timePeriodID === undefined || systemLevelID === undefined
      ? undefined
      : relayUrl(origin, 'dataAvailability', { timePeriodID, systemLevelID, indicatorID }),
  };

  const categories = indicator.Categories;
  if (Array.isArray(categories)) {
    for (const category of categories) {
      if (!isObject(category)) continue;
      const isPersons = category.MetricCategoryTypeName === 'Sex'
        && category.MetricCategoryName === 'Persons';
      if (includeAllMetricLinks || isPersons) metricLinks(origin, category, timePeriodID, areaID);
    }
  }
}

function decorateAreaRows(value: unknown, origin: string, timePeriodID?: number, inheritedSystemLevelID?: number) {
  if (!Array.isArray(value)) return;
  for (const row of value) {
    if (isObject(row)) areaLinks(origin, row, timePeriodID, inheritedSystemLevelID);
  }
}

function decorateComparisonLevels(value: unknown, origin: string, timePeriodID?: number) {
  if (!Array.isArray(value)) return;
  for (const level of value) {
    if (!isObject(level)) continue;
    decorateAreaRows(level.ComparisonData, origin, timePeriodID, numberField(level, 'SystemLevelID'));
  }
}

function enrichResponse(payload: unknown, requestUrl: URL, apiPath: string) {
  if (!isObject(payload)) return payload;

  const origin = linkOrigin(requestUrl);
  const timePeriodID = Number(requestUrl.searchParams.get('timePeriodID')) || undefined;
  const areaID = Number(requestUrl.searchParams.get('areaID')) || undefined;
  const systemLevelID = Number(requestUrl.searchParams.get('systemLevelID')) || undefined;

  payload._links = {
    self: new URL(`${requestUrl.pathname}${requestUrl.search}`, origin).toString(),
    apiIndex: new URL('/api/cvdprevent', origin).toString(),
    skill: new URL('/skill.md', origin).toString(),
    apiReference: new URL('/api-reference.md', origin).toString(),
  };

  if (apiPath === 'timePeriod' && Array.isArray(payload.timePeriodList)) {
    for (const period of payload.timePeriodList) {
      if (!isObject(period)) continue;
      const periodID = numberField(period, 'TimePeriodID');
      if (periodID === undefined) continue;
      period._links = {
        navigation: relayUrl(origin, `period/${periodID}`),
      };
    }
  }

  decorateAreaRows(payload.areaList, origin, timePeriodID);
  decorateAreaRows(payload.foundAreaList, origin, timePeriodID);
  decorateAreaRows(payload.unassignedAreaList, origin, timePeriodID);

  if (isObject(payload.areaDetails)) {
    areaLinks(origin, payload.areaDetails, timePeriodID);
    decorateAreaRows(payload.areaDetails.ParentAreaList, origin, timePeriodID);
    decorateAreaRows(payload.areaDetails.ChildAreaList, origin, timePeriodID);
  }

  if (Array.isArray(payload.indicatorList)) {
    for (const indicator of payload.indicatorList) {
      if (isObject(indicator)) indicatorLinks(origin, indicator, timePeriodID, systemLevelID, areaID);
    }
  }

  if (isObject(payload.indicatorData)) {
    indicatorLinks(origin, payload.indicatorData, timePeriodID, systemLevelID, areaID, true);
  }

  for (const key of ['siblingData', 'childData']) {
    const comparison = payload[key];
    if (isObject(comparison)) decorateAreaRows(comparison.Data, origin, timePeriodID);
  }

  if (isObject(payload.Data)) {
    decorateAreaRows(payload.Data.Areas, origin, timePeriodID);
    decorateComparisonLevels(payload.Data.SystemLevels, origin, timePeriodID);
  }

  return payload;
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const apiPath = path.join('/');

  if (!JSON_PATHS.some(pattern => pattern.test(apiPath))) {
    return NextResponse.json(
      { error: 'Unsupported CVDPREVENT API path' },
      { status: 404, headers: corsHeaders() },
    );
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`/${apiPath}`, API_ORIGIN);
  upstreamUrl.search = requestUrl.search;
  upstreamUrl.searchParams.delete('agentVersion');
  if (apiPath === 'indicator/list') upstreamUrl.searchParams.delete('areaID');
  if (/^indicator\/\d+\/rawDataJSON$/.test(apiPath)) {
    upstreamUrl.searchParams.delete('metricCategoryTypeName');
    upstreamUrl.searchParams.delete('metricCategoryName');
    upstreamUrl.searchParams.delete('categoryAttribute');
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: {
          ...corsHeaders(),
          'Cache-Control': CACHE_CONTROL,
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        },
      });
    }

    const payload: unknown = await upstream.json();
    if (/^indicator\/\d+\/rawDataJSON$/.test(apiPath) && isObject(payload)) {
      const rows = payload.indicatorRawData;
      if (Array.isArray(rows)) {
        const categoryType = requestUrl.searchParams.get('metricCategoryTypeName');
        const categoryName = requestUrl.searchParams.get('metricCategoryName');
        const categoryAttribute = requestUrl.searchParams.get('categoryAttribute');
        payload.indicatorRawData = rows.filter(row => isObject(row)
          && (categoryType === null || row.MetricCategoryTypeName === categoryType)
          && (categoryName === null || row.MetricCategoryName === categoryName)
          && (categoryAttribute === null || row.CategoryAttribute === categoryAttribute));
      }
    }
    return NextResponse.json(enrichResponse(payload, requestUrl, apiPath), {
      headers: { ...corsHeaders(), 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    console.error('CVDPREVENT API relay failed', error);
    return NextResponse.json(
      { error: 'CVDPREVENT API is unavailable' },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
