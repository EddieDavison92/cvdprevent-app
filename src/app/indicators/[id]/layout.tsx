import type { Metadata } from 'next';
import { indicatorPageMetadata } from '@/lib/seo';

type IndicatorLayoutProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: IndicatorLayoutProps): Promise<Metadata> {
  const { id } = await params;
  return indicatorPageMetadata(id);
}

export default function IndicatorDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
