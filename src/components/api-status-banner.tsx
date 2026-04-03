'use client';

import { AlertTriangle } from 'lucide-react';

interface ApiUnavailableProps {
  className?: string;
}

export function ApiUnavailable({ className }: ApiUnavailableProps) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className ?? ''}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <p className="font-semibold">CVDPREVENT API is currently unavailable</p>
        <p className="mt-1 text-amber-700">
          The upstream NHS data service is not responding. Data will load automatically
          when the service recovers.
        </p>
      </div>
    </div>
  );
}
