import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import {
  catalogChangeKey,
  diffCatalogSnapshots,
  fetchCatalogSnapshot,
  formatCatalogAlert,
  getInitialCatalogSnapshot,
} from '@/lib/monitor/catalog';
import { readCatalogState, writeCatalogState } from '@/lib/monitor/state';

export const maxDuration = 30;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: 'Catalog state storage is not configured' }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Maintainer email is not configured' }, { status: 503 });
  }

  try {
    const previous = await readCatalogState() ?? getInitialCatalogSnapshot();
    const current = await fetchCatalogSnapshot();
    const changes = diffCatalogSnapshots(previous, current);

    if (changes.hasChanges) {
      await sendEmail({
        subject: '[CVDPREVENT data] New data available',
        text: formatCatalogAlert(previous, current, changes),
        idempotencyKey: catalogChangeKey(current),
      });
    }

    await writeCatalogState(current);
    return NextResponse.json({
      ok: true,
      changed: changes.hasChanges,
      standardPeriod: current.standardPeriod.name,
      outcomePeriod: current.outcomePeriod.name,
      newIndicators: changes.newIndicators.map(indicator => indicator.code),
      removedIndicators: changes.removedIndicators.map(indicator => indicator.code),
    });
  } catch (error) {
    console.error('Catalog monitor failed', error);
    return NextResponse.json({ error: 'Catalog check failed' }, { status: 502 });
  }
}
