'use client';

import { useMemo } from 'react';
import { SparklineCard } from './sparkline-card';
import { getDashboardSections, isLowerBetterIndicator } from '@/lib/constants/indicator-sections';
import type { IndicatorWithData } from '@/lib/api/types';

interface TrendsViewProps {
  indicators: IndicatorWithData[];
  isEngland: boolean;
}

export function TrendsView({ indicators, isEngland }: TrendsViewProps) {
  const sections = useMemo(() => getDashboardSections(indicators), [indicators]);
  const indicatorMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of indicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [indicators]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Trends by pathway stage</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {isEngland ? 'Direction across recent national periods.' : 'Recent direction for every indicator, grouped for scanning.'}
          </p>
        </div>
        <p className="text-xs text-gray-500">Prevalence trends show recording direction, not health improvement</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          const sectionIndicators = section.indicatorCodes
            .map((code) => indicatorMap.get(code))
            .filter((ind): ind is IndicatorWithData => ind !== undefined);

          if (sectionIndicators.length === 0) return null;

          return (
            <section key={section.id} aria-labelledby={`trends-${section.id}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <header className="border-b border-gray-100 px-4 py-3">
                <h3 id={`trends-${section.id}`} className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />
                  {section.name}
                  <span className="text-sm font-normal text-gray-500">{sectionIndicators.length}</span>
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">{section.description}</p>
              </header>
              <div className="divide-y divide-gray-100">
                {sectionIndicators.map((ind) => (
                  <SparklineCard
                    key={ind.IndicatorID}
                    indicator={ind}
                    sectionColor={section.color}
                    lowerIsBetter={isLowerBetterIndicator(ind.IndicatorCode, ind)}
                    recordedPrevalence={section.id === 'prevalence'}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
