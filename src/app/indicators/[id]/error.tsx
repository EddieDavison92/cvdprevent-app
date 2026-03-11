'use client';

import { ErrorFallback } from '@/components/error-fallback';

export default function IndicatorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      title="Indicator unavailable"
      description="Failed to load this indicator. It may not exist or there may be a temporary issue with the data source."
      reset={reset}
    />
  );
}
