import { ROUTE_SEO } from '@/lib/seo';

export const metadata = ROUTE_SEO.indicators;

export default function IndicatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
