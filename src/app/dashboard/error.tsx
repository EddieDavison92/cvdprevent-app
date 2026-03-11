'use client';

import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-nhs-pale-grey/30 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-nhs-dark-blue">
          Dashboard unavailable
        </h1>
        <p className="text-gray-600">
          Failed to load the dashboard. This may be a temporary issue with the
          data source.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-nhs-dark-blue text-white rounded hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-nhs-dark-blue text-nhs-dark-blue rounded hover:bg-nhs-pale-grey transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
