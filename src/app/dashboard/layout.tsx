import { ROUTE_SEO } from '@/lib/seo';

export const metadata = ROUTE_SEO.dashboard;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
