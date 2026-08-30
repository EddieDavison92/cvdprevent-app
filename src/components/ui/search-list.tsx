'use client';

import * as React from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Shared presentation for organisation/command search surfaces.
// Rules: NHS-blue leading icon, h-12/h-14 field, 11px uppercase group labels,
// 8x14 level badge (solid blue when active), blue/7% active row, kbd hints.

export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 font-sans text-[11px] text-gray-500',
        className
      )}
      {...props}
    />
  );
}

/** Keeps keyboard selection visible inside a scrollable search-results container. */
export function useActiveResultScroll<T extends HTMLElement>(activeResultId: string | number | undefined) {
  const containerRef = React.useRef<T>(null);

  React.useEffect(() => {
    if (activeResultId === undefined) return;
    const frame = requestAnimationFrame(() => {
      containerRef.current
        ?.querySelector<HTMLElement>('[data-active="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeResultId]);

  return containerRef;
}

interface SearchFieldProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  size?: 'md' | 'lg';
  trailing?: React.ReactNode;
}

export function SearchField({ size = 'md', trailing, className, ...props }: SearchFieldProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-nhs-blue"
        aria-hidden
      />
      <input
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'w-full min-w-0 bg-transparent pl-12 text-base text-gray-900 outline-none placeholder:text-gray-400',
          size === 'lg' ? 'h-14' : 'h-12',
          trailing ? 'pr-24' : 'pr-4',
          className
        )}
        {...props}
      />
      {trailing && (
        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
          {trailing}
        </div>
      )}
    </div>
  );
}

export function SearchGroupLabel({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-400',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function LevelBadge({ active, className, children }: { active?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-14 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-semibold uppercase tracking-wide transition-colors',
        active ? 'bg-nhs-blue text-white' : 'bg-nhs-blue/10 text-nhs-blue',
        className
      )}
    >
      {children}
    </span>
  );
}

// Icon slot matching LevelBadge dimensions so rows align across groups.
export function RowIcon({ active, icon: Icon }: { active?: boolean; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors',
        active ? 'bg-nhs-blue text-white' : 'bg-nhs-blue/10 text-nhs-blue'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

interface SearchResultRowProps extends Omit<React.ComponentProps<'button'>, 'title'> {
  active?: boolean;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function SearchResultRow({ active, leading, title, subtitle, trailing, className, ...props }: SearchResultRowProps) {
  return (
    <button
      type="button"
      data-active={active ? 'true' : undefined}
      className={cn(
        'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus:outline-none',
        active ? 'bg-nhs-blue/[0.07]' : 'hover:bg-gray-50',
        className
      )}
      {...props}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">{title}</span>
        {subtitle && <span className="block truncate text-xs text-gray-500">{subtitle}</span>}
      </span>
      {trailing ?? (
        <ArrowRight
          className={cn('h-4 w-4 flex-shrink-0 text-nhs-blue transition-opacity', active ? 'opacity-100' : 'opacity-0')}
          aria-hidden
        />
      )}
    </button>
  );
}

export function SearchEmptyState({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div role="status" className={cn('px-4 py-8 text-center text-sm text-gray-500', className)} {...props}>
      {children}
    </div>
  );
}

export function SearchResultsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-gray-100" aria-busy aria-label="Loading results">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="h-8 w-14 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SearchFooterHints({ className, hints }: { className?: string; hints: { keys: React.ReactNode; label: string }[] }) {
  return (
    <div className={cn('flex items-center gap-4 border-t border-gray-100 bg-gray-50/60 px-4 py-2 text-[11px] text-gray-500', className)}>
      {hints.map((h) => (
        <span key={h.label} className="inline-flex items-center gap-1.5">
          <Kbd>{h.keys}</Kbd>
          {h.label}
        </span>
      ))}
    </div>
  );
}
