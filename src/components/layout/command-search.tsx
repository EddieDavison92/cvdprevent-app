'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, BarChart3, List, Globe, ArrowRight } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { useAreaIndicators } from '@/lib/hooks/use-area-indicators';
import { getAreaDisplayName } from '@/lib/api';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { buildUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import type { Area, IndicatorWithData } from '@/lib/api/types';

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: 'page' | 'org' | 'indicator';
  title: string;
  subtitle?: string;
  badge?: string;
  action: () => void;
}

const PAGES = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Overview of all indicators', path: '/dashboard', icon: BarChart3 },
  { id: 'indicators', title: 'Indicators', subtitle: 'Browse and explore all indicators', path: '/indicators', icon: List },
  { id: 'benchmarks', title: 'Benchmarks', subtitle: 'Rank and compare areas across indicators', path: '/benchmarks', icon: BarChart3 },
  { id: 'england', title: 'England Overview', subtitle: 'National-level data', path: '/dashboard', isEngland: true, icon: Globe },
];

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organisation, setOrganisation } = useOrganisation();

  // Lazy-load area data (cached after first fetch)
  const { data: latestPeriod } = useLatestTimePeriod('standard');
  const { areasByLevel, isLoading: isLoadingAreas } = useAllAreas(latestPeriod?.TimePeriodID);

  // Indicator data (only if org is set — already cached from dashboard)
  const { data: standardIndicators } = useAreaIndicators(
    latestPeriod?.TimePeriodID,
    organisation?.AreaID
  );
  const { data: latestOutcomePeriod } = useLatestTimePeriod('outcome');
  const { data: outcomeIndicators } = useAreaIndicators(
    latestOutcomePeriod?.TimePeriodID,
    organisation?.AreaID
  );
  const allIndicators = useMemo(() => {
    if (!standardIndicators && !outcomeIndicators) return [];
    return [...(standardIndicators ?? []), ...(outcomeIndicators ?? [])];
  }, [standardIndicators, outcomeIndicators]);

  // Flatten all areas + build parent lookup
  const { allOrgs, parentLookup } = useMemo(() => {
    const orgs: Area[] = [];
    const lookup = new Map<number, Area>();
    for (const [, areaList] of areasByLevel) {
      for (const area of areaList) {
        orgs.push(area);
        lookup.set(area.AreaID, area);
      }
    }
    return { allOrgs: orgs, parentLookup: lookup };
  }, [areasByLevel]);

  const getParentName = useCallback((area: Area): string | undefined => {
    if (area.Parents?.length > 0) {
      const parent = parentLookup.get(area.Parents[0]);
      return parent ? getAreaDisplayName(parent) : undefined;
    }
    return undefined;
  }, [parentLookup]);

  // Build search results
  const results = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    const items: SearchResult[] = [];

    // Pages (always shown, filtered by query)
    const pageResults = PAGES.filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.subtitle?.toLowerCase().includes(q)
    );
    for (const page of pageResults) {
      items.push({
        id: `page-${page.id}`,
        type: 'page',
        title: page.title,
        subtitle: page.subtitle,
        action: () => {
          if (page.isEngland) {
            setOrganisation({
              AreaCode: 'E92000001',
              AreaID: 1,
              AreaName: 'England',
              Parents: [],
              SystemLevelID: 1,
              SystemLevelName: 'England',
            });
            router.push('/dashboard?area=1');
          } else {
            router.push(buildUrl(page.path, searchParams));
          }
          onOpenChange(false);
        },
      });
    }

    // Organisations
    if (q.length >= 2) {
      const orgResults = allOrgs
        .filter((area) => {
          const name = area.AreaName.toLowerCase();
          const parentName = getParentName(area)?.toLowerCase() ?? '';
          return name.includes(q) || parentName.includes(q);
        })
        .slice(0, 20);

      for (const area of orgResults) {
        items.push({
          id: `org-${area.AreaID}`,
          type: 'org',
          title: getAreaDisplayName(area),
          subtitle: getParentName(area),
          badge: SYSTEM_LEVEL_NAMES[area.SystemLevelID],
          action: () => {
            setOrganisation(area);
            router.push(`/dashboard?area=${area.AreaID}`);
            onOpenChange(false);
          },
        });
      }
    }

    // Indicators (only if org is set and query matches)
    if (q.length >= 2 && allIndicators.length > 0) {
      const indicatorResults = allIndicators
        .filter((ind) => {
          const code = ind.IndicatorCode.toLowerCase();
          const name = ind.IndicatorShortName.toLowerCase();
          return code.includes(q) || name.includes(q);
        })
        .slice(0, 10);

      for (const ind of indicatorResults) {
        items.push({
          id: `ind-${ind.IndicatorID}`,
          type: 'indicator',
          title: ind.IndicatorShortName.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim(),
          subtitle: ind.IndicatorCode,
          action: () => {
            router.push(buildUrl(`/dashboard/${ind.IndicatorID}`, searchParams));
            onOpenChange(false);
          },
        });
      }
    }

    return items;
  }, [query, allOrgs, allIndicators, getParentName, setOrganisation, router, searchParams, onOpenChange]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [results.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-index="${highlightedIndex}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[highlightedIndex]) {
      e.preventDefault();
      results[highlightedIndex].action();
    }
  };

  // Group results by type for display
  const grouped = useMemo(() => {
    const pages = results.filter((r) => r.type === 'page');
    const orgs = results.filter((r) => r.type === 'org');
    const indicators = results.filter((r) => r.type === 'indicator');
    return { pages, orgs, indicators };
  }, [results]);

  // Map result to its global index
  const getGlobalIndex = (type: 'page' | 'org' | 'indicator', localIdx: number) => {
    if (type === 'page') return localIdx;
    if (type === 'org') return grouped.pages.length + localIdx;
    return grouped.pages.length + grouped.orgs.length + localIdx;
  };

  const renderItem = (result: SearchResult, globalIdx: number) => (
    <button
      key={result.id}
      data-index={globalIdx}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
        globalIdx === highlightedIndex ? 'bg-nhs-blue/5 text-nhs-blue' : 'text-gray-700 hover:bg-gray-50'
      )}
      onClick={result.action}
      onMouseEnter={() => setHighlightedIndex(globalIdx)}
    >
      {result.type === 'org' && <Building2 className="h-4 w-4 shrink-0 text-gray-400" />}
      {result.type === 'indicator' && <BarChart3 className="h-4 w-4 shrink-0 text-gray-400" />}
      {result.type === 'page' && <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{result.title}</div>
        {result.subtitle && (
          <div className="truncate text-xs text-gray-400">{result.subtitle}</div>
        )}
      </div>
      {result.badge && (
        <Badge variant="outline" className="shrink-0 text-[10px] font-medium">
          {result.badge}
        </Badge>
      )}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="!max-w-2xl overflow-hidden p-0 gap-0" onKeyDown={handleKeyDown}>
        <VisuallyHidden><DialogTitle>Search</DialogTitle></VisuallyHidden>

        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organisations, indicators, pages..."
            aria-label="Search organisations, indicators, and pages"
            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {isLoadingAreas && query.length >= 2 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              Loading organisations...
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {/* Pages */}
              {grouped.pages.length > 0 && (
                <div>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Pages
                  </div>
                  {grouped.pages.map((r, i) => renderItem(r, getGlobalIndex('page', i)))}
                </div>
              )}

              {/* Organisations */}
              {grouped.orgs.length > 0 && (
                <div>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Organisations
                  </div>
                  {grouped.orgs.map((r, i) => renderItem(r, getGlobalIndex('org', i)))}
                </div>
              )}

              {/* Indicators */}
              {grouped.indicators.length > 0 && (
                <div>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Indicators
                  </div>
                  {grouped.indicators.map((r, i) => renderItem(r, getGlobalIndex('indicator', i)))}
                </div>
              )}
            </>
          )}

          {/* Hint when no query */}
          {query.length < 2 && results.length <= PAGES.length && (
            <div className="px-3 py-4 text-center text-xs text-gray-400">
              Type at least 2 characters to search organisations and indicators
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t px-3 py-2 text-[10px] text-gray-400">
          <span><kbd className="rounded border bg-gray-100 px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-gray-100 px-1 py-0.5 font-mono">↵</kbd> select</span>
          <span><kbd className="rounded border bg-gray-100 px-1 py-0.5 font-mono">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
