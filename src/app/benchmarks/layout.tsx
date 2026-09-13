import { ROUTE_SEO } from '@/lib/seo';

export const metadata = ROUTE_SEO.benchmarks;

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
