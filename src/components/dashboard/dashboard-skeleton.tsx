import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for the Overview tab (priorities card + section cards) */
export function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Priorities card skeleton */}
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-6 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Section cards skeleton */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="rounded-lg border p-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the Trends tab (sparkline grid) */
export function TrendsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the Pathways tab */
export function PathwaysSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-56" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
