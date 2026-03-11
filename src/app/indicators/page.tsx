'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, SearchX, Pill, Target, ClipboardCheck, HeartPulse, List, ChevronRight,
} from 'lucide-react';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAreaIndicators, getPersonsData } from '@/lib/hooks/use-area-indicators';
import { DASHBOARD_SECTIONS, type SectionType } from '@/lib/constants/indicator-sections';
import { formatValue, extractCondition } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  prevalence: Activity,
  detection: SearchX,
  treatment: Pill,
  control: Target,
  monitoring: ClipboardCheck,
  outcomes: HeartPulse,
};

export default function IndicatorsIndexPage() {
  const searchParams = useSearchParams();
  const [conditionFilter, setConditionFilter] = useState<string | null>(null);

  const { data: stdPeriod } = useLatestTimePeriod('standard');
  const { data: outPeriod } = useLatestTimePeriod('outcome');

  const { data: engStdInds, isLoading: isLoadingStd } = useAreaIndicators(stdPeriod?.TimePeriodID, 1);
  const { data: engOutInds, isLoading: isLoadingOut } = useAreaIndicators(outPeriod?.TimePeriodID, 1);

  const allIndicators = useMemo(
    () => [...(engStdInds ?? []), ...(engOutInds ?? [])],
    [engStdInds, engOutInds],
  );
  const isLoading = isLoadingStd || isLoadingOut;

  // Build flat indicator list with section info
  const indicators = useMemo(() => {
    const result: {
      id: number; code: string; shortName: string; condition: string;
      value: number | null; format: string; sectionId: SectionType; sectionName: string;
    }[] = [];

    for (const section of DASHBOARD_SECTIONS) {
      for (const code of section.indicatorCodes) {
        const ind = allIndicators.find(i => i.IndicatorCode === code);
        if (!ind) continue;
        const persons = getPersonsData(ind);
        result.push({
          id: ind.IndicatorID,
          code: ind.IndicatorCode,
          shortName: ind.IndicatorShortName.replace(/\s*\(CVDP\d+[A-Z]+\)/, '').trim(),
          condition: extractCondition(ind.IndicatorShortName),
          value: persons?.Data.Value ?? null,
          format: ind.FormatDisplayName,
          sectionId: section.id,
          sectionName: section.name,
        });
      }
    }
    return result;
  }, [allIndicators]);

  // Unique conditions for filter pills
  const conditions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ind of indicators) {
      counts.set(ind.condition, (counts.get(ind.condition) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [indicators]);

  // Filter + group by section
  const sections = useMemo(() => {
    const filtered = conditionFilter
      ? indicators.filter(ind => ind.condition === conditionFilter)
      : indicators;

    return DASHBOARD_SECTIONS
      .map(section => ({
        ...section,
        indicators: filtered.filter(ind => ind.sectionId === section.id),
      }))
      .filter(s => s.indicators.length > 0);
  }, [indicators, conditionFilter]);

  const buildHref = (indicatorId: number) => {
    const params = new URLSearchParams();
    const level = searchParams.get('level');
    const parent = searchParams.get('parent');
    if (level) params.set('level', level);
    if (parent) params.set('parent', parent);
    const qs = params.toString();
    return qs ? `/indicators/${indicatorId}?${qs}` : `/indicators/${indicatorId}`;
  };

  const visibleCount = sections.reduce((sum, s) => sum + s.indicators.length, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-nhs-pale-grey/30 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nhs-blue/10">
                <List className="h-5 w-5 text-nhs-blue" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-nhs-dark-blue">Indicators</h1>
                <p className="text-sm text-gray-500">
                  {isLoading ? 'Loading...' : `${indicators.length} indicators across ${DASHBOARD_SECTIONS.length} domains`}
                </p>
              </div>
            </div>
          </div>

          {/* Condition filters */}
          {conditions.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setConditionFilter(null)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  !conditionFilter ? 'bg-nhs-dark-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border',
                )}
              >
                All ({indicators.length})
              </button>
              {conditions.map(c => (
                <button
                  key={c.name}
                  onClick={() => setConditionFilter(conditionFilter === c.name ? null : c.name)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    conditionFilter === c.name ? 'bg-nhs-dark-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border',
                  )}
                >
                  {c.name} ({c.count})
                </button>
              ))}
            </div>
          )}

          {/* Sections */}
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : visibleCount === 0 ? (
            <div className="flex h-40 items-center justify-center text-gray-400">
              No indicators match this filter
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map(section => {
                const Icon = SECTION_ICONS[section.id];
                return (
                  <div key={section.id}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                      <h2 className="text-sm font-semibold text-gray-700">{section.name}</h2>
                      <span className="text-xs text-gray-400">({section.indicators.length})</span>
                    </div>

                    <div className="rounded-lg border bg-white divide-y">
                      {section.indicators.map(ind => (
                        <Link
                          key={ind.id}
                          href={buildHref(ind.id)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors group"
                        >
                          <code className="text-[10px] text-gray-400 font-mono w-[90px] shrink-0">{ind.code}</code>
                          <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{ind.shortName}</span>
                          <span className="text-sm font-semibold text-nhs-blue tabular-nums shrink-0">
                            {ind.value != null ? formatValue(ind.value, ind.format) : '—'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
