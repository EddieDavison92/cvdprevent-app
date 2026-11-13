import { describe, expect, it } from 'vitest';
import { createAreaMatcher, pickBoundaryFile, type BoundaryVintage } from '@/lib/utils/boundaries';

const vintages: BoundaryVintage[] = [
  {
    file: '/geo/sub-icbs-2026.geojson',
    codes: ['E38000266', 'E38000268', 'E38000240'],
    names: ['NHS Hampshire and Isle of Wight ICB - D9Y0V', 'NHS Thames Valley ICB - U2G6B', 'NHS West and North London ICB - 93C'],
  },
  {
    file: '/geo/sub-icbs-2023.geojson',
    codes: ['E38000253', 'E38000252', 'E38000240'],
    names: ['NHS Hampshire and Isle of Wight ICB - D9Y0V', 'NHS Frimley ICB - D4U1Y', 'NHS North Central London ICB - 93C'],
  },
];

const area = (code: string, name: string) => ({ code, name });

describe('pickBoundaryFile', () => {
  it('counts name matches where the API kept an old code', () => {
    const data = [
      area('E38000253', 'NHS Hampshire and Isle Of Wight ICB - D9Y0V'),
      area('E38000268', 'NHS Thames Valley ICB - U2G6B'),
      area('E38000240', 'NHS West and North London ICB - 93C'),
    ];
    expect(pickBoundaryFile(vintages, data)).toBe('/geo/sub-icbs-2026.geojson');
  });

  it('picks the older vintage for pre-merger data', () => {
    const data = [area('E38000252', 'NHS Frimley ICB - D4U1Y'), area('E38000240', 'x'), area('E38000253', 'y')];
    expect(pickBoundaryFile(vintages, data)).toBe('/geo/sub-icbs-2023.geojson');
  });

  it('prefers the newest vintage on a tie or with no data', () => {
    expect(pickBoundaryFile(vintages, [area('E38000240', 'x')])).toBe('/geo/sub-icbs-2026.geojson');
    expect(pickBoundaryFile(vintages, [])).toBe('/geo/sub-icbs-2026.geojson');
  });

  it('returns undefined for levels without boundaries', () => {
    expect(pickBoundaryFile(undefined, [area('E54000030', 'x')])).toBeUndefined();
  });
});

describe('createAreaMatcher', () => {
  it('matches by code first, then by case-insensitive name', () => {
    const hiow = area('E38000253', 'NHS Hampshire and Isle Of Wight ICB - D9Y0V');
    const match = createAreaMatcher([hiow]);
    expect(match('E38000253', 'anything')).toBe(hiow);
    expect(match('E38000266', 'NHS Hampshire and Isle of Wight ICB - D9Y0V')).toBe(hiow);
    expect(match('E38000999', 'Unknown')).toBeUndefined();
  });
});
