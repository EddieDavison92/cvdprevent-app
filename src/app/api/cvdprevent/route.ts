import { NextResponse } from 'next/server';

const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';

export function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    name: 'CVDPREVENT agent API',
    description: 'Read-only linked access to the public CVDPREVENT API.',
    instructions: 'Open timePeriods first, then follow exact URLs from each _links object.',
    _links: {
      timePeriods: new URL('/api/cvdprevent/timePeriod', origin).toString(),
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
