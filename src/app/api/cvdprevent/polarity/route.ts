import { NextResponse } from 'next/server';
import { DASHBOARD_SECTIONS, isLowerBetterIndicator } from '@/lib/constants/indicator-sections';

const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';
const AGENT_VERSION = '5';
const PUBLIC_ORIGIN = 'https://www.cvdprevent-explorer.app';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
  };
}

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = ['localhost', '127.0.0.1'].includes(requestUrl.hostname)
    ? requestUrl.origin
    : PUBLIC_ORIGIN;

  const indicators = DASHBOARD_SECTIONS.flatMap(section => section.indicatorCodes.map(IndicatorCode => ({
    IndicatorCode,
    Section: section.name,
    Polarity: section.id === 'prevalence'
      ? 'recording measure'
      : isLowerBetterIndicator(IndicatorCode) ? 'lower is better' : 'higher is better',
    ClassificationSource: 'maintained mapping',
  })));

  return NextResponse.json({
    agentVersion: AGENT_VERSION,
    note: 'Match by IndicatorCode. Treat absent codes as unclassified and do not infer a performance direction silently.',
    indicators,
    _links: {
      self: new URL(`/api/cvdprevent/polarity?agentVersion=${AGENT_VERSION}`, origin).toString(),
      skill: new URL('/skill.md', origin).toString(),
    },
  }, {
    headers: { ...corsHeaders(), 'Cache-Control': CACHE_CONTROL },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
