import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import {
  cleanIndicatorTitle,
  DEFAULT_TITLE,
  indicatorPageMetadata,
  pageMetadata,
  SITE_URL,
  STATIC_SITEMAP_PATHS,
  siteJsonLd,
} from '@/lib/seo';

describe('page metadata', () => {
  it('points canonicals and Open Graph URLs at the www host via metadataBase paths', () => {
    const metadata = pageMetadata({
      title: 'Indicators',
      description: 'Browse the catalogue.',
      path: '/indicators',
    });

    expect(metadata.alternates).toEqual({ canonical: '/indicators' });
    expect(metadata.openGraph).toMatchObject({
      title: 'Indicators',
      url: '/indicators',
      locale: 'en_GB',
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary',
      title: 'Indicators',
    });
  });

  it('keeps the home title absolute so it is not doubled by the site template', () => {
    const metadata = pageMetadata({
      title: DEFAULT_TITLE,
      description: 'Home',
      path: '/',
      absoluteTitle: true,
    });

    expect(metadata.title).toEqual({ absolute: DEFAULT_TITLE });
  });

  it('strips trailing indicator codes from titles', () => {
    expect(cleanIndicatorTitle('Hypertension prevalence (CVDP001HYP)')).toBe('Hypertension prevalence');
  });

  it('does not treat a mixed id segment as a real indicator', async () => {
    const metadata = await indicatorPageMetadata('123extra');
    expect(metadata.title).toBe('CVDPREVENT indicator');
    expect(metadata.alternates).toEqual({ canonical: '/indicators/123extra' });
  });
});

describe('sitemap and robots', () => {
  it('covers the public explorer and agent surfaces on the canonical host', () => {
    const paths = STATIC_SITEMAP_PATHS.map((entry) => `${SITE_URL}${entry.path}`);

    expect(paths).toEqual(expect.arrayContaining([
      SITE_URL,
      `${SITE_URL}/indicators`,
      `${SITE_URL}/benchmarks`,
      `${SITE_URL}/dashboard`,
      `${SITE_URL}/skills`,
      `${SITE_URL}/skill.md`,
      `${SITE_URL}/llms.txt`,
    ]));
    expect(paths.some((url) => url.includes('vercel.app'))).toBe(false);
  });

  it('keeps robots on the canonical host and excludes internal API routes', () => {
    const result = robots();

    expect(result.host).toBe(SITE_URL);
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(result.rules).toMatchObject({
      allow: '/',
      disallow: ['/api/cron/', '/api/feedback'],
    });
  });
});

describe('structured data', () => {
  it('describes an unofficial explorer without inventing an NHS organisation', () => {
    const jsonLd = JSON.stringify(siteJsonLd());

    expect(jsonLd).toContain('WebSite');
    expect(jsonLd).toContain('WebApplication');
    expect(jsonLd).toContain('unofficial');
    expect(jsonLd).toContain('not affiliated with NHS England');
    expect(jsonLd).not.toContain('"@type":"Organization"');
  });
});
