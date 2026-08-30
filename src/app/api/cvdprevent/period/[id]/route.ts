import { NextResponse } from 'next/server';

const API_ORIGIN = 'https://api.cvdprevent.nhs.uk';
const PUBLIC_ORIGIN = 'https://cvdprevent-explorer.app';
const AGENT_VERSION = '4';
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';

type RouteContext = { params: Promise<{ id: string }> };
type SystemLevel = {
  SystemLevelID: number;
  SystemLevelName: string;
};

export const maxDuration = 30;

function relayUrl(origin: string, path: string, params: Record<string, string | number> = {}) {
  const url = new URL(`/api/cvdprevent/${path}`, origin);
  url.searchParams.set('agentVersion', AGENT_VERSION);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url.toString();
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const timePeriodID = Number(id);
  if (!Number.isInteger(timePeriodID) || timePeriodID < 1) {
    return NextResponse.json({ error: 'Invalid time period' }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = ['localhost', '127.0.0.1'].includes(requestUrl.hostname)
    ? requestUrl.origin
    : PUBLIC_ORIGIN;

  try {
    const upstream = await fetch(`${API_ORIGIN}/area/systemLevel?timePeriodID=${timePeriodID}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'CVDPREVENT system levels are unavailable' }, { status: 502 });
    }

    const payload = await upstream.json() as { systemLevels?: SystemLevel[] };
    const systemLevels = payload.systemLevels ?? [];

    return NextResponse.json({
      TimePeriodID: timePeriodID,
      systemLevels,
      _links: {
        areas: systemLevels.map(level => ({
          systemLevelID: level.SystemLevelID,
          systemLevelName: level.SystemLevelName,
          href: relayUrl(origin, 'area', { timePeriodID, systemLevelID: level.SystemLevelID }),
        })),
        indicatorLists: systemLevels.map(level => ({
          systemLevelID: level.SystemLevelID,
          systemLevelName: level.SystemLevelName,
          href: relayUrl(origin, 'indicator/list', { timePeriodID, systemLevelID: level.SystemLevelID }),
        })),
        dataAvailability: systemLevels.map(level => ({
          systemLevelID: level.SystemLevelID,
          systemLevelName: level.SystemLevelName,
          href: relayUrl(origin, 'dataAvailability', { timePeriodID, systemLevelID: level.SystemLevelID }),
        })),
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('CVDPREVENT period navigation failed', error);
    return NextResponse.json({ error: 'CVDPREVENT API is unavailable' }, { status: 502 });
  }
}
