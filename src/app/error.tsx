'use client';

import { ErrorFallback } from '@/components/error-fallback';
import { ApiUnavailable } from '@/components/api-status-banner';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isApiError = error?.message?.includes('API error') || error?.message?.includes('fetch');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      {isApiError && <ApiUnavailable className="max-w-lg" />}
      <ErrorFallback
        title="Something went wrong"
        description={isApiError
          ? "The page can't load because the upstream data service isn't responding."
          : "An unexpected error occurred. Please try again or return to the home page."}
        reset={reset}
      />
    </div>
  );
}
