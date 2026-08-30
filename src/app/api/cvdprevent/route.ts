import { NextResponse } from 'next/server';

const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';
const AGENT_VERSION = '3';
const PUBLIC_ORIGIN = 'https://cvdprevent-explorer.app';

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = ['localhost', '127.0.0.1'].includes(requestUrl.hostname)
    ? requestUrl.origin
    : PUBLIC_ORIGIN;
  const timePeriods = new URL('/api/cvdprevent/timePeriod', origin);
  timePeriods.searchParams.set('agentVersion', AGENT_VERSION);

  return NextResponse.json({
    name: 'CVDPREVENT agent API',
    description: 'Read-only linked access to the public CVDPREVENT API.',
    instructions: 'Open timePeriods first, then follow exact URLs from each _links object.',
    agentVersion: AGENT_VERSION,
    _links: {
      timePeriods: timePeriods.toString(),
      skill: new URL('/skill.md', origin).toString(),
      apiReference: new URL('/api-reference.md', origin).toString(),
    },
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}
