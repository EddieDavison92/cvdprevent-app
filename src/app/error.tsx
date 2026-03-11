'use client';

import { ErrorFallback } from '@/components/error-fallback';

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      title="Something went wrong"
      description="An unexpected error occurred. Please try again or return to the home page."
      reset={reset}
      fullScreen
    />
  );
}
