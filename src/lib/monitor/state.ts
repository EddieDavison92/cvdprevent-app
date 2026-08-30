import { get, put } from '@vercel/blob';
import type { CatalogSnapshot } from './catalog';

const SNAPSHOT_PATH = 'monitor/cvdprevent-catalog.json';

export async function readCatalogState(): Promise<CatalogSnapshot | null> {
  const result = await get(SNAPSHOT_PATH, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text()) as CatalogSnapshot;
}

export async function writeCatalogState(snapshot: CatalogSnapshot) {
  await put(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
  });
}
