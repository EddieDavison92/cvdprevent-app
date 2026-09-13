import type { Metadata } from 'next';
import { getIndicators } from '@/lib/api/indicators';
import { getLatestPeriod, getTimePeriods } from '@/lib/api/time-periods';
import { SYSTEM_LEVELS, type Indicator } from '@/lib/api/types';

export const SITE_URL = 'https://www.cvdprevent-explorer.app';
export const SITE_NAME = 'CVDPREVENT Explorer';
export const DEFAULT_TITLE = 'CVDPREVENT Data Explorer';
export const DEFAULT_DESCRIPTION =
  'Unofficial explorer for public CVDPREVENT cardiovascular prevention indicators across NHS geographies in England.';

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  /** Keep the title as-is instead of applying the site template. */
  absoluteTitle?: boolean;
};

export function pageMetadata({ title, description, path, absoluteTitle }: PageSeo): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_GB',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export const ROUTE_SEO = {
  home: pageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    absoluteTitle: true,
  }),
  dashboard: pageMetadata({
    title: 'Organisation dashboard',
    description:
      'Review public CVDPREVENT prevention indicators for a selected NHS organisation, including trends, pathways and improvement views.',
    path: '/dashboard',
  }),
  indicators: pageMetadata({
    title: 'Indicators',
    description:
      'Browse the public CVDPREVENT indicator catalogue by clinical domain and condition, with latest England values.',
    path: '/indicators',
  }),
  benchmarks: pageMetadata({
    title: 'Benchmarks',
    description:
      'Compare NHS organisations on public CVDPREVENT prevention indicators and rank them against England or a parent geography.',
    path: '/benchmarks',
  }),
  skills: pageMetadata({
    title: 'Use CVDPREVENT data with an AI assistant',
    description:
      'Copy one URL and give it to ChatGPT, Claude, or another web-enabled assistant to query public aggregate CVDPREVENT data.',
    path: '/skills',
  }),
} as const;

export const STATIC_SITEMAP_PATHS = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1 },
  { path: '/indicators', changeFrequency: 'weekly' as const, priority: 0.9 },
  { path: '/benchmarks', changeFrequency: 'weekly' as const, priority: 0.8 },
  { path: '/dashboard', changeFrequency: 'weekly' as const, priority: 0.7 },
  { path: '/skills', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/skill.md', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/skill-examples.md', changeFrequency: 'monthly' as const, priority: 0.5 },
  { path: '/api-reference.md', changeFrequency: 'monthly' as const, priority: 0.5 },
  { path: '/skill-relay.md', changeFrequency: 'monthly' as const, priority: 0.4 },
  { path: '/sitemap.md', changeFrequency: 'monthly' as const, priority: 0.3 },
  { path: '/llms.txt', changeFrequency: 'monthly' as const, priority: 0.4 },
  { path: '/api/cvdprevent', changeFrequency: 'monthly' as const, priority: 0.4 },
  { path: '/api/cvdprevent/polarity', changeFrequency: 'monthly' as const, priority: 0.4 },
];

export function cleanIndicatorTitle(name: string) {
  return name.replace(/\s*\(CVDP?\d+[A-Z]*\)\s*$/i, '').trim();
}

export async function listPublicIndicators(): Promise<Indicator[]> {
  try {
    const periods = await getTimePeriods();
    const standard = getLatestPeriod(periods, 'standard');
    const outcome = getLatestPeriod(periods, 'outcome');
    const [standardIndicators, outcomeIndicators] = await Promise.all([
      standard ? getIndicators(standard.TimePeriodID, SYSTEM_LEVELS.ENGLAND) : Promise.resolve([]),
      outcome ? getIndicators(outcome.TimePeriodID, SYSTEM_LEVELS.ENGLAND) : Promise.resolve([]),
    ]);

    const byId = new Map<number, Indicator>();
    for (const indicator of [...standardIndicators, ...outcomeIndicators]) {
      byId.set(indicator.IndicatorID, indicator);
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

export async function indicatorPageMetadata(
  id: string,
  pathPrefix: '/indicators' | '/dashboard' = '/indicators',
): Promise<Metadata> {
  const path = `${pathPrefix}/${id}`;
  const fallback = pageMetadata({
    title: pathPrefix === '/dashboard' ? 'Organisation indicator' : 'CVDPREVENT indicator',
    description:
      'Compare this public CVDPREVENT indicator across NHS geographies in England. Aggregate audit data, not clinical advice.',
    path,
  });

  const indicatorId = Number.parseInt(id, 10);
  if (Number.isNaN(indicatorId)) return fallback;

  const indicator = (await listPublicIndicators()).find((item) => item.IndicatorID === indicatorId);
  if (!indicator) return fallback;

  const shortName = cleanIndicatorTitle(indicator.IndicatorShortName);
  return pageMetadata({
    title: `${shortName} (${indicator.IndicatorCode})`,
    description: `${indicator.IndicatorName.replace(/\.*$/, '')}. Public aggregate CVDPREVENT audit data for NHS geographies in England; not clinical advice.`,
    path,
  });
}

export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
      },
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        description:
          'Independent, unofficial explorer for public aggregate CVDPREVENT cardiovascular prevention indicators. Not the official CVDPREVENT Data and Improvement Tool and not affiliated with NHS England.',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
      },
    ],
  };
}
