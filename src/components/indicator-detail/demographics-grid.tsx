'use client';

import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DemographicChart } from '@/components/charts/demographic-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { ChartTableToggle, useChartTableActions, type TableColumn } from '@/components/charts';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { getIndicatorCategories, DEPRIVATION_LABELS } from '@/lib/api/indicators';
import { formatValue } from '@/lib/utils/format';
interface DemographicsGridProps {
  indicator: Indicator;
  areaData: IndicatorRawData[];
  baselineData: IndicatorRawData[];
  baselineName?: string;
  areaName?: string;
  areaCode?: string;
  timePeriod?: string;
  isEngland?: boolean;
  isLoading?: boolean;
}

const DEMOGRAPHICS = [
  { type: 'Sex', label: 'By Sex', excludeCategories: ['Persons'] },
  { type: 'Age group', label: 'By Age Group', excludeCategories: [] },
  { type: 'Deprivation quintile', label: 'By Deprivation Quintile', excludeCategories: [] },
  { type: 'Ethnicity', label: 'By Ethnicity', excludeCategories: [] },
];

// Find the single biggest gap to baseline across all demographics
function findBiggestGap(
  demographicsWithData: {
    demo: typeof DEMOGRAPHICS[0];
    chartData: { name: string; orgValue: number | null; baselineValue: number | null }[];
  }[],
  baselineName: string,
): string | null {
  let worst: { demoLabel: string; name: string; gap: number } | null = null;

  for (const { demo, chartData } of demographicsWithData) {
    for (const d of chartData) {
      if (d.orgValue === null || d.baselineValue === null) continue;
      const gap = d.orgValue - d.baselineValue;
      if (!worst || gap < worst.gap) {
        worst = { demoLabel: demo.label.replace('By ', ''), name: d.name, gap };
      }
    }
  }

  // Only flag if gap is both >2pp absolute AND >3% relative to baseline value
  if (!worst || worst.gap >= -2) return null;
  const baseVal = demographicsWithData
    .flatMap((d) => d.chartData)
    .find((d) => d.name === worst!.name)?.baselineValue;
  if (baseVal && (Math.abs(worst.gap) / baseVal) * 100 < 3) return null;
  return `Biggest gap to ${baselineName}: ${worst.name} (${worst.demoLabel.toLowerCase()}) — ${Math.abs(worst.gap).toFixed(1)}pp below`;
}

export function DemographicsGrid({ indicator, areaData, baselineData, baselineName = 'England', areaName, areaCode, timePeriod, isEngland, isLoading }: DemographicsGridProps) {
  const formatFn = useCallback((v: number) => formatValue(v, indicator.FormatDisplayName), [indicator.FormatDisplayName]);
  const categories = getIndicatorCategories();
  const displayAreaName = areaName || 'Selected Area';

  const demographicsWithData = useMemo(() => {
    return DEMOGRAPHICS.map((demo) => {
      const category = categories.find((c) => c.type === demo.type);
      if (!category) return null;

      const relevantCategories = category.categories.filter(
        (name) => !demo.excludeCategories.includes(name)
      );

      const chartData = relevantCategories
        .map((name) => {
          const item = areaData.find(
            (d) => d.MetricCategoryTypeName === demo.type && d.MetricCategoryName === name
          );
          const baseItem = baselineData.find(
            (d) => d.MetricCategoryTypeName === demo.type && d.MetricCategoryName === name
          );
          return {
            name,
            orgValue: item?.Value ?? null,
            baselineValue: baseItem?.Value ?? null,
            orgNumerator: item?.Numerator ?? null,
            orgDenominator: item?.Denominator ?? null,
            baselineNumerator: baseItem?.Numerator ?? null,
            baselineDenominator: baseItem?.Denominator ?? null,
          };
        })
        .filter((d) => d.orgValue !== null || d.baselineValue !== null);

      const hasAreaData = chartData.some((d) => d.orgValue !== null);

      return { demo, chartData, hasAreaData };
    }).filter(Boolean) as { demo: typeof DEMOGRAPHICS[0]; chartData: { name: string; orgValue: number | null; baselineValue: number | null; orgNumerator: number | null; orgDenominator: number | null; baselineNumerator: number | null; baselineDenominator: number | null }[]; hasAreaData: boolean }[];
  }, [categories, areaData, baselineData]);

  const visibleDemographics = useMemo(() => {
    if (isEngland) {
      return demographicsWithData.filter((d) => d.chartData.length > 0);
    }
    return demographicsWithData.filter((d) => d.hasAreaData);
  }, [demographicsWithData, isEngland]);

  // Single most notable demographic insight
  const biggestGap = useMemo(() => {
    if (isEngland) return null;
    return findBiggestGap(visibleDemographics, baselineName);
  }, [visibleDemographics, isEngland, baselineName]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {DEMOGRAPHICS.slice(0, 4).map((demo) => (
          <Card key={demo.type} className="gap-2 py-4">
            <CardHeader className="gap-1">
              <CardTitle className="text-base">{demo.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[150px] items-center justify-center text-gray-400">
                Loading...
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (visibleDemographics.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-gray-500">
            Demographic breakdowns are not available at this level.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Single key demographic insight */}
      {biggestGap && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {biggestGap}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visibleDemographics.map(({ demo, chartData }) => (
          <DemographicCard
            key={demo.type}
            demo={demo}
            chartData={chartData}
            indicator={indicator}
            displayAreaName={displayAreaName}
            areaCode={areaCode}
            baselineName={baselineName}
            timePeriod={timePeriod}
            isEngland={isEngland}
            formatFn={formatFn}
          />
        ))}
      </div>
    </div>
  );
}

/** Individual demographic card — extracted so each can use the useChartTableActions hook */
function DemographicCard({
  demo,
  chartData,
  indicator,
  displayAreaName,
  areaCode,
  baselineName,
  timePeriod,
  isEngland,
  formatFn,
}: {
  demo: typeof DEMOGRAPHICS[0];
  chartData: { name: string; orgValue: number | null; baselineValue: number | null; orgNumerator: number | null; orgDenominator: number | null; baselineNumerator: number | null; baselineDenominator: number | null }[];
  indicator: Indicator;
  displayAreaName: string;
  areaCode?: string;
  baselineName: string;
  timePeriod?: string;
  isEngland?: boolean;
  formatFn: (v: number) => string;
}) {
  const simpleChartData = useMemo(() => chartData.map((d) => ({
    name: DEPRIVATION_LABELS[d.name]?.short ?? d.name,
    tooltipName: DEPRIVATION_LABELS[d.name]?.full,
    value: d.orgValue,
    numerator: d.orgNumerator,
    denominator: d.orgDenominator,
  })), [chartData]);

  const tableData = useMemo(() => chartData.map((d) => ({
    category: DEPRIVATION_LABELS[d.name]?.full ?? d.name,
    value: d.orgValue,
    numerator: d.orgNumerator,
    denominator: d.orgDenominator,
    baselineValue: d.baselineValue,
  })), [chartData]);

  const tableColumns: TableColumn[] = useMemo(() => {
    const cols: TableColumn[] = [
      { key: 'category', header: demo.label.replace('By ', ''), align: 'left' },
      { key: 'value', header: displayAreaName, align: 'right', format: (v) => v != null ? formatFn(v as number) : '—' },
      { key: 'numerator', header: 'Count', align: 'right', format: (v) => v != null ? (v as number).toLocaleString() : '—' },
      { key: 'denominator', header: 'Population', align: 'right', format: (v) => v != null ? (v as number).toLocaleString() : '—' },
    ];
    if (!isEngland) {
      cols.push({
        key: 'baselineValue',
        header: baselineName,
        align: 'right',
        format: (v) => v != null ? formatFn(v as number) : '—',
      });
    }
    return cols;
  }, [demo.label, displayAreaName, baselineName, isEngland, formatFn]);

  const periodSlug = timePeriod?.replace(/\s+/g, '-') ?? '';
  const { viewMode, actions } = useChartTableActions({
    tableData,
    columns: tableColumns,
    filename: `${indicator.IndicatorCode}-${demo.type.replace(/\s+/g, '-').toLowerCase()}${areaCode ? `-${areaCode}` : ''}${periodSlug ? `-${periodSlug}` : ''}`,
    metadata: [
      ['Indicator', `${indicator.IndicatorShortName} (${indicator.IndicatorCode})`],
      ['Area', areaCode ? `${displayAreaName} (${areaCode})` : displayAreaName],
      ['Breakdown', demo.label],
      ...(timePeriod ? [['Period', timePeriod] as [string, string]] : []),
    ],
  });

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{demo.label}</CardTitle>
          {chartData.length > 0 && actions}
        </div>
        <CardDescription className="text-xs">
          {indicator.IndicatorShortName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[150px] items-center justify-center text-sm text-gray-500">
            No data available
          </div>
        ) : (
          <ChartTableToggle
            chart={
              isEngland ? (
                <BarChart
                  data={simpleChartData}
                  formatValue={formatFn}
                  height={200}
                />
              ) : (
                <DemographicChart
                  data={chartData}
                  orgName={displayAreaName}
                  baselineName={baselineName}
                  formatValue={formatFn}
                  height={200}
                />
              )
            }
            tableData={tableData}
            columns={tableColumns}
            viewMode={viewMode}
          />
        )}
      </CardContent>
    </Card>
  );
}
