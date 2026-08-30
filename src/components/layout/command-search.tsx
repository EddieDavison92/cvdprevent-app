'use client';

import { useState, useMemo, useRef, useEffect, useCallback, type ComponentType } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Kbd,
  LevelBadge,
  RowIcon,
  SearchEmptyState,
  SearchField,
  SearchFooterHints,
  SearchGroupLabel,
  SearchResultRow,
  SearchResultsSkeleton,
  useActiveResultScroll,
} from '@/components/ui/search-list';
import { BarChart3, Bot, List, Globe, LayoutDashboard, CornerDownLeft } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { useAreaIndicators } from '@/lib/hooks/use-area-indicators';
import { getAreaDisplayName } from '@/lib/api';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { buildUrl } from '@/lib/utils/url';
import type { Area } from '@/lib/api/types';
import { findKnownParentArea } from '@/lib/utils/geography';

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
  icon?: ComponentType<{ className?: string }>;
  action: () => void;
}

const PAGES = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Overview of all indicators', path: '/dashboard', icon: LayoutDashboard },
  { id: 'indicators', title: 'Indicators', subtitle: 'Browse and explore all indicators', path: '/indicators', icon: List },
  { id: 'benchmarks', title: 'Benchmarks', subtitle: 'Rank and compare areas across indicators', path: '/benchmarks', icon: BarChart3 },
  { id: 'skills', title: 'Ask with AI', subtitle: 'Query data in ChatGPT or Claude', path: '/skills', icon: Bot },
  { id: 'england', title: 'England Overview', subtitle: 'National-level data', path: '/dashboard', isEngland: true, icon: Globe },
];

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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
      const parent = findKnownParentArea(area, parentLookup);
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
        icon: page.icon,
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
    if (!open) return;
    const timer = setTimeout(() => {
      setQuery('');
      setHighlightedIndex(0);
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  const listRef = useActiveResultScroll<HTMLDivElement>(results[highlightedIndex]?.id);

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

  const renderItem = (result: SearchResult, globalIdx: number) => {
    const active = globalIdx === highlightedIndex;
    return (
      <SearchResultRow
        key={result.id}
        data-index={globalIdx}
        tabIndex={-1}
        active={active}
        onClick={result.action}
        onMouseEnter={() => setHighlightedIndex(globalIdx)}
        leading={
          result.type === 'org' ? (
            <LevelBadge active={active}>{result.badge ?? 'Area'}</LevelBadge>
          ) : (
            <RowIcon active={active} icon={result.icon ?? BarChart3} />
          )
        }
        title={result.title}
        subtitle={result.subtitle}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="!max-w-2xl overflow-hidden rounded-2xl border-gray-200 p-0 gap-0" onKeyDown={handleKeyDown}>
        <VisuallyHidden><DialogTitle>Search</DialogTitle></VisuallyHidden>

        <div className="border-b border-gray-100">
          <SearchField
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder="Search organisations, indicators, pages…"
            aria-label="Search organisations, indicators, and pages"
            trailing={<Kbd>esc</Kbd>}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto pb-1">
          {isLoadingAreas && query.length >= 2 ? (
            <SearchResultsSkeleton />
          ) : results.length === 0 && query.length >= 2 ? (
            <SearchEmptyState>No results for &ldquo;{query}&rdquo;</SearchEmptyState>
          ) : (
            <>
              {grouped.pages.length > 0 && (
                <div>
                  <SearchGroupLabel>Pages</SearchGroupLabel>
                  {grouped.pages.map((r, i) => renderItem(r, getGlobalIndex('page', i)))}
                </div>
              )}

              {grouped.orgs.length > 0 && (
                <div>
                  <SearchGroupLabel>Organisations</SearchGroupLabel>
                  {grouped.orgs.map((r, i) => renderItem(r, getGlobalIndex('org', i)))}
                </div>
              )}

              {grouped.indicators.length > 0 && (
                <div>
                  <SearchGroupLabel>Indicators</SearchGroupLabel>
                  {grouped.indicators.map((r, i) => renderItem(r, getGlobalIndex('indicator', i)))}
                </div>
              )}
            </>
          )}

          {/* Hint when no query */}
          {query.length < 2 && results.length <= PAGES.length && (
            <p className="px-4 py-3 text-center text-xs text-gray-500">
              Type at least 2 characters to search organisations and indicators
            </p>
          )}
        </div>

        <SearchFooterHints
          hints={[
            { keys: '↑↓', label: 'navigate' },
            { keys: <CornerDownLeft className="h-3 w-3" aria-hidden />, label: 'select' },
            { keys: 'esc', label: 'close' },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
