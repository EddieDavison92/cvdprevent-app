import type { MetadataRoute } from 'next';
import { listPublicIndicators, SITE_URL, STATIC_SITEMAP_PATHS } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const indicators = await listPublicIndicators();

  const staticEntries = STATIC_SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const indicatorEntries = indicators.map((indicator) => ({
    url: `${SITE_URL}/indicators/${indicator.IndicatorID}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...indicatorEntries];
}
