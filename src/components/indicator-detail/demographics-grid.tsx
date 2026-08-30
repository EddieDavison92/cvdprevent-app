'use client';

import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DemographicChart } from '@/components/charts/demographic-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { ChartTableToggle, useChartTableActions, type TableColumn } from '@/components/charts';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { DEPRIVATION_LABELS } from '@/lib/api/indicators';
import { formatValue, formatAbsDiff } from '@/lib/utils/format';
import {
  findDemographicItem,
  formatDemographicCategoryLabel,
  getAvailableDemographics,
  getDemographicCategoryNames,
  isSuppressedDemographicValue,
  type DemographicDefinition,
} from '@/lib/utils/demographics';
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
  lowerIsBetter: boolean;
}

interface DemographicDatum {
  name: string;
  orgValue: number | null;
  baselineValue: number | null;
  orgNumerator: number | null;
  orgDenominator: number | null;
  baselineNumerator: number | null;
  baselineDenominator: number | null;
  orgSuppressed: boolean;
  baselineSuppressed: boolean;
}

// Find the single biggest gap to baseline across all demographics
function findBiggestGap(
  demographicsWithData: {
    demo: DemographicDefinition;
    chartData: DemographicDatum[];
  }[],
  baselineName: string,
  formatDisplayName: string,
  lowerIsBetter: boolean,
): string | null {
  // Signed gap is normalised so negative = worse, regardless of polarity
  const sign = lowerIsBetter ? -1 : 1;
  let worst: {
    demoLabel: string;
    name: string;
    orgValue: number;
    baselineValue: number;
    gap: number;
    signed: number;
  } | null = null;

  for (const { demo, chartData } of demographicsWithData) {
    for (const d of chartData) {
      if (d.orgValue === null || d.baselineValue === null) continue;
      const gap = d.orgValue - d.baselineValue;
      const signed = gap * sign;
      if (!worst || signed < worst.signed) {
        worst = {
          demoLabel: demo.label.replace('By ', ''),
          name: d.name,
          orgValue: d.orgValue,
          baselineValue: d.baselineValue,
          gap,
          signed,
        };
      }
    }
  }

  // Only flag if gap is both >2pp absolute AND >3% relative to baseline value
  if (!worst || worst.signed >= -2) return null;
  if (worst.baselineValue && (Math.abs(worst.gap) / worst.baselineValue) * 100 < 3) return null;

  const groupLabel = DEPRIVATION_LABELS[worst.name]
    ? `Deprivation quintile ${worst.name.split(' ')[0]}`
    : `${worst.demoLabel}: ${worst.name}`;
  const direction = worst.gap < 0 ? 'below' : 'above';
  return `Largest gap: ${groupLabel} — ${formatValue(worst.orgValue, formatDisplayName)} vs ${baselineName} ${formatValue(worst.baselineValue, formatDisplayName)} (${formatAbsDiff(worst.gap, formatDisplayName)} ${direction})`;
}

export function DemographicsGrid({ indicator, areaData, baselineData, baselineName = 'England', areaName, areaCode, timePeriod, isEngland, isLoading, lowerIsBetter }: DemographicsGridProps) {
  const formatFn = useCallback((v: number) => formatValue(v, indicator.FormatDisplayName), [indicator.FormatDisplayName]);
  const displayAreaName = areaName || 'Selected Area';
  const demographics = useMemo(
    () => getAvailableDemographics(areaData, baselineData),
    [areaData, baselineData]
  );

  const demographicsWithData = useMemo(() => {
    return demographics.map((demo) => {
      const relevantCategories = getDemographicCategoryNames(
        demo.type,
        areaData,
        baselineData,
        demo.excludeCategories,
      );

      const chartData = relevantCategories
        .map((name) => {
          const item = findDemographicItem(areaData, demo.type, name);
          const baseItem = findDemographicItem(baselineData, demo.type, name);
          return {
            name,
            orgValue: item?.Value ?? null,
            baselineValue: baseItem?.Value ?? null,
            orgNumerator: item?.Numerator ?? null,
            orgDenominator: item?.Denominator ?? null,
            baselineNumerator: baseItem?.Numerator ?? null,
            baselineDenominator: baseItem?.Denominator ?? null,
            orgSuppressed: isSuppressedDemographicValue(item),
            baselineSuppressed: isSuppressedDemographicValue(baseItem),
          };
        })
        .filter((d) => d.orgValue !== null || d.baselineValue !== null || d.orgSuppressed || d.baselineSuppressed);

      const hasAreaData = chartData.some((d) => d.orgValue !== null || d.orgSuppressed);

      return { demo, chartData, hasAreaData };
    }).filter(Boolean) as { demo: DemographicDefinition; chartData: DemographicDatum[]; hasAreaData: boolean }[];
  }, [demographics, areaData, baselineData]);

  const visibleDemographics = useMemo(() => {
    if (isEngland) {
      return demographicsWithData.filter((d) => d.chartData.length > 0);
    }
    return demographicsWithData.filter((d) => d.hasAreaData);
  }, [demographicsWithData, isEngland]);

  // Single most notable demographic insight
  const biggestGap = useMemo(() => {
    if (isEngland) return null;
    return findBiggestGap(visibleDemographics, baselineName, indicator.FormatDisplayName, lowerIsBetter);
  }, [visibleDemographics, isEngland, baselineName, indicator.FormatDisplayName, lowerIsBetter]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {demographics.slice(0, 4).map((demo) => (
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
  demo: DemographicDefinition;
  chartData: DemographicDatum[];
  indicator: Indicator;
  displayAreaName: string;
  areaCode?: string;
  baselineName: string;
  timePeriod?: string;
  isEngland?: boolean;
  formatFn: (v: number) => string;
}) {
  const simpleChartData = useMemo(() => chartData.map((d) => ({
    name: DEPRIVATION_LABELS[d.name]?.short ?? formatDemographicCategoryLabel(d.name),
    tooltipName: DEPRIVATION_LABELS[d.name]?.full,
    value: d.orgValue,
    numerator: d.orgNumerator,
    denominator: d.orgDenominator,
  })), [chartData]);

  const tableData = useMemo(() => chartData.map((d) => ({
    category: DEPRIVATION_LABELS[d.name]?.full ?? formatDemographicCategoryLabel(d.name),
    value: d.orgSuppressed ? 'Suppressed' : d.orgValue,
    numerator: d.orgSuppressed ? 'Suppressed' : d.orgNumerator,
    denominator: d.orgSuppressed ? 'Suppressed' : d.orgDenominator,
    baselineValue: d.baselineSuppressed ? 'Suppressed' : d.baselineValue,
  })), [chartData]);

  const comparisonChartData = useMemo(() => chartData.map((d) => ({
    ...d,
    name: DEPRIVATION_LABELS[d.name]?.short ?? formatDemographicCategoryLabel(d.name),
  })), [chartData]);

  const tableColumns: TableColumn[] = useMemo(() => {
    const cols: TableColumn[] = [
      { key: 'category', header: demo.label.replace('By ', ''), align: 'left' },
      { key: 'value', header: displayAreaName, align: 'right', format: (v) => typeof v === 'number' ? formatFn(v) : String(v ?? '—') },
      { key: 'numerator', header: 'Count', align: 'right', format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v ?? '—') },
      { key: 'denominator', header: 'Population', align: 'right', format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v ?? '—') },
    ];
    if (!isEngland) {
      cols.push({
        key: 'baselineValue',
        header: baselineName,
        align: 'right',
        format: (v) => typeof v === 'number' ? formatFn(v) : String(v ?? '—'),
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
    fullscreen: {
      title: demo.label,
      description: `${indicator.IndicatorShortName}${isEngland ? '' : ` — ${displayAreaName} compared with ${baselineName}`}`,
      chart: isEngland ? (
        <BarChart
          data={simpleChartData}
          formatValue={formatFn}
          height="calc(100vh - 9rem)"
        />
      ) : (
        <DemographicChart
          data={comparisonChartData}
          orgName={displayAreaName}
          baselineName={baselineName}
          formatValue={formatFn}
          height="calc(100vh - 9rem)"
          barMaxWidth={64}
        />
      ),
    },
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
                  data={comparisonChartData}
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
