'use client';

import { ErrorFallback } from '@/components/error-fallback';
import { ApiUnavailable } from '@/components/api-status-banner';

export default function IndicatorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isApiError = error?.message?.includes('API error') || error?.message?.includes('fetch');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
      {isApiError && <ApiUnavailable className="max-w-lg" />}
      <ErrorFallback
        title="Indicator unavailable"
        description={isApiError
          ? "This indicator can't load because the upstream data service isn't responding."
          : "Failed to load this indicator. It may not exist or there may be a temporary issue with the data source."}
        reset={reset}
      />
    </div>
  );
}
