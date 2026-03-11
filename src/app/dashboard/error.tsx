'use client';

import { ErrorFallback } from '@/components/error-fallback';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      title="Dashboard unavailable"
      description="Failed to load the dashboard. This may be a temporary issue with the data source."
      reset={reset}
    />
  );
}
