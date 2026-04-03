'use client';

import { useApiStatus } from '@/lib/hooks/use-api-status';
import { AlertTriangle } from 'lucide-react';

export function ApiStatusBanner() {
  const { isApiDown, isChecking } = useApiStatus();

  if (isChecking || !isApiDown) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="mx-auto max-w-7xl flex items-center gap-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <p>
          <span className="font-semibold">CVDPREVENT API is currently unavailable.</span>{' '}
          The upstream NHS data service is not responding. Data across the app will fail to
          load until the service recovers. This page will update automatically when
          connectivity is restored.
        </p>
      </div>
    </div>
  );
}
