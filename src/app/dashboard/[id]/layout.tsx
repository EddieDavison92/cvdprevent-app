import type { Metadata } from 'next';
import { indicatorPageMetadata } from '@/lib/seo';

type IndicatorLayoutProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: IndicatorLayoutProps): Promise<Metadata> {
  const { id } = await params;
  return indicatorPageMetadata(id, '/dashboard');
}

export default function DashboardIndicatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
