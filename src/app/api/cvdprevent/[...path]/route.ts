import { NextResponse } from 'next/server';

const API_ORIGIN = 'https://api.cvdprevent.nhs.uk';
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';

const JSON_PATHS = [
  /^timePeriod(?:\/systemLevels)?$/,
  /^area$/,
  /^area\/(?:systemLevel(?:\/timePeriods)?|unassigned|search)$/,
  /^area\/\d+\/(?:details|nestedSubSystems|flatSubSystems)$/,
  /^indicator$/,
  /^indicator\/(?:list|metricList|tags|priorityGroups|siblingData|childData)$/,
  /^indicator\/(?:pathwayGroup|indicatorGroup)\/\d+$/,
  /^indicator\/\d+\/(?:details|data|rawDataJSON)$/,
  /^indicator\/metric\/\d+\/data$/,
  /^indicator\/(?:nationalVsAreaMetricData|timeSeriesByMetric|personsTimeSeriesByIndicator|metricSystemLevelComparison|metricAreaBreakdown)\/\d+$/,
  /^externalResource$/,
  /^dataAvailability$/,
];

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export const maxDuration = 30;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
  };
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

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(25_000),
    });

    const headers = new Headers(corsHeaders());
    headers.set('Cache-Control', CACHE_CONTROL);
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json; charset=utf-8');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
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
