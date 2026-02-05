import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { OrganisationProvider } from '@/providers/organisation-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CVDPREVENT Data Explorer',
  description: 'Explore cardiovascular disease prevention indicators across NHS geographies',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <Suspense fallback={null}>
            <OrganisationProvider>{children}</OrganisationProvider>
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
