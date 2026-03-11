'use client';

import { ErrorFallback } from '@/components/error-fallback';

export default function BenchmarksError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      title="Benchmarks unavailable"
      description="Failed to load benchmarking data. This may be a temporary issue with the data source."
      reset={reset}
    />
  );
}
