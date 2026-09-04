'use client';

import { useCallback, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LensRow } from '@/lib/utils/improvement-lenses';

export function cleanIndicatorName(name: string) {
  return name.replace(/\s*\(CVDP?\d+[A-Z]*\)\s*$/i, '').trim();
}

export function cleanAreaName(name: string) {
  return name
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '')
    .replace(/ - [A-Z0-9]+$/, '');
}

/** Reads and writes one query-string value, dropping it when it equals the fallback. */
export function useUrlParam(key: string, fallback: string): [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? fallback;
  const set = useCallback((next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === fallback) params.delete(key);
    else params.set(key, next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, key, fallback]);
  return [value, set];
}

export function IndicatorName({ row, extra }: { row: LensRow; extra?: ReactNode }) {
  const name = cleanIndicatorName(row.indicator.IndicatorShortName);
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-gray-800 group-hover:text-nhs-blue" title={name}>{name}</p>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
        <span className="font-mono">{row.indicator.IndicatorCode}</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.section.color }} aria-hidden />
          {row.section.name}
        </span>
        {extra}
      </div>
    </div>
  );
}

export function LensHeader({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
      <div className="min-w-0 max-w-3xl">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function ColumnHeadings({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div className={cn('hidden gap-4 border-b border-gray-100 bg-gray-50/60 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:grid', columns)}>
      {labels.map((label, index) => <span key={index} className={label.startsWith('>') ? 'text-right' : undefined}>{label.replace(/^>/, '')}</span>)}
    </div>
  );
}

export function EmptyLens({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-gray-500">{children}</p>;
}

export function MobileLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs text-gray-400 lg:hidden">{children}</span>;
}
