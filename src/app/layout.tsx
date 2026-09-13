import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { OrganisationProvider } from '@/providers/organisation-context';
import { Footer } from '@/components/layout/footer';
import {
  DEFAULT_TITLE,
  ROUTE_SEO,
  SITE_NAME,
  SITE_URL,
  siteJsonLd,
} from '@/lib/seo';

function SuspenseFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-nhs-pale-grey/30">
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nhs-blue border-t-transparent" aria-hidden />
      </div>
      <Footer />
    </div>
  );
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  ...ROUTE_SEO.home,
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  openGraph: {
    ...ROUTE_SEO.home.openGraph,
    siteName: SITE_NAME,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <QueryProvider>
          <Suspense fallback={<SuspenseFallback />}>
            <OrganisationProvider>{children}</OrganisationProvider>
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
