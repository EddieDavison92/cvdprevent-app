/** One boundary file and the areas it contains (see public/geo/index.json). */
export interface BoundaryVintage {
  file: string;
  codes: string[];
  names: string[];
}

/** System level ID -> vintages, newest first. Written by scripts/download-boundaries.mjs. */
export type BoundaryIndex = Record<string, BoundaryVintage[]>;

interface NamedArea {
  code: string;
  name: string;
}

/** Case- and space-insensitive key; API and ONS names differ in capitalisation. */
export function normaliseAreaName(name: string | null | undefined): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Looks up a boundary feature's area by code, falling back to name. The API sometimes
 * keeps an old code where ONS issued a new one (e.g. sub-ICB "... ICB - D9Y0V" is
 * E38000253 in the API but E38000266 in the April 2026 boundaries).
 */
export function createAreaMatcher<T extends NamedArea>(areas: T[]) {
  const byCode = new Map(areas.map((a) => [a.code, a]));
  const byName = new Map(areas.map((a) => [normaliseAreaName(a.name), a]));
  return (code: string, name: string): T | undefined =>
    byCode.get(code) ?? byName.get(normaliseAreaName(name));
}

/**
 * Picks the boundary file matching the most data areas. NHS reorganisations
 * (e.g. the April 2026 ICB mergers) change codes, so older periods need older files.
 * Ties go to the newest vintage.
 */
export function pickBoundaryFile(
  vintages: BoundaryVintage[] | undefined,
  areas: NamedArea[],
): string | undefined {
  if (!vintages?.length) return undefined;

  let best = vintages[0];
  let bestMatches = -1;
  for (const vintage of vintages) {
    const codes = new Set(vintage.codes);
    const names = new Set(vintage.names.map(normaliseAreaName));
    const matches = areas.filter(
      (a) => codes.has(a.code) || names.has(normaliseAreaName(a.name)),
    ).length;
    if (matches > bestMatches) {
      best = vintage;
      bestMatches = matches;
    }
  }
  return best.file;
}
