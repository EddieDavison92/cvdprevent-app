import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.cvdprevent-explorer.app';

const routes = [
  '',
  '/skills',
  '/indicators',
  '/benchmarks',
  '/skill.md',
  '/skill-examples.md',
  '/api-reference.md',
  '/skill-relay.md',
  '/sitemap.md',
  '/llms.txt',
  '/api/cvdprevent',
  '/api/cvdprevent/polarity',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/skill.md' ? 0.9 : 0.7,
  }));
}
