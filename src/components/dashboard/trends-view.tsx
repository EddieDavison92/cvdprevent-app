'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SparklineCard } from './sparkline-card';
import { DASHBOARD_SECTIONS } from '@/lib/constants/indicator-sections';
import type { IndicatorWithData } from '@/lib/api/types';

interface TrendsViewProps {
  indicators: IndicatorWithData[];
  isEngland: boolean;
}

export function TrendsView({ indicators, isEngland }: TrendsViewProps) {
  // Build a quick lookup by indicator code
  const indicatorMap = useMemo(() => {
    const map = new Map<string, IndicatorWithData>();
    for (const ind of indicators) {
      map.set(ind.IndicatorCode, ind);
    }
    return map;
  }, [indicators]);

  return (
    <div className="space-y-4">
      {DASHBOARD_SECTIONS.map((section) => {
        const sectionIndicators = section.indicatorCodes
          .map((code) => indicatorMap.get(code))
          .filter((ind): ind is IndicatorWithData => ind !== undefined);

        if (sectionIndicators.length === 0) return null;

        return (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                <CardTitle className="text-base">{section.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {sectionIndicators.length} indicators
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sectionIndicators.map((ind) => (
                  <SparklineCard
                    key={ind.IndicatorID}
                    indicator={ind}
                    sectionColor={section.color}
                    lowerIsBetter={section.lowerIsBetter}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
