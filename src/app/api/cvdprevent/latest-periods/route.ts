import { NextResponse } from 'next/server';
import { getResolvedLatestPeriods } from '@/lib/api/time-periods';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const periods = await getResolvedLatestPeriods();
    return NextResponse.json(
      {
        standard: periods.standard ?? null,
        outcome: periods.outcome ?? null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('Latest period selection failed', error);
    return NextResponse.json({ error: 'Latest periods are unavailable' }, { status: 502 });
  }
}
