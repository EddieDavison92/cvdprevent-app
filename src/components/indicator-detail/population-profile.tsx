'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartTableToggle, useChartTableActions, type TableColumn } from '@/components/charts';
import { nhsEChartsTheme, defaultChartOptions } from '@/components/charts/chart-theme';
import { NHS_COLORS } from '@/lib/constants/colors';
import { DEPRIVATION_LABELS } from '@/lib/api/indicators';
import type { IndicatorRawData } from '@/lib/api/types';
import {
  computePopulationShares,
  type CategoryShare,
} from '@/lib/utils/population-profile';
import {
  formatDemographicCategoryLabel,
  getAvailableDemographics,
  getDemographicCategoryNames,
  type DemographicDefinition,
} from '@/lib/utils/demographics';

interface PopulationProfileProps {
  areaData: IndicatorRawData[];
  baselineData: IndicatorRawData[];
  areaName?: string;
  baselineName?: string;
  isEngland?: boolean;
  isLoading?: boolean;
  indicatorName?: string;
  indicatorCode?: string;
  areaCode?: string;
  timePeriod?: string;
}

function ProfileChart({
  data,
  areaName,
  baselineName,
  isEngland,
}: {
  data: CategoryShare[];
  areaName: string;
  baselineName: string;
  isEngland?: boolean;
}) {
  const categories = data.map((d) => DEPRIVATION_LABELS[d.name]?.short ?? formatDemographicCategoryLabel(d.name));
  const hasAreaSuppression = data.some((d) => d.areaSuppressed);
  const hasBaselineSuppression = data.some((d) => d.baselineSuppressed);

  const option = useMemo(() => ({
    ...defaultChartOptions,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const items = params as { dataIndex: number; seriesId: string; seriesName: string; value: number | null; color: string }[];
        if (!items.length) return '';
        const d = data[items[0].dataIndex];
        const fullName = DEPRIVATION_LABELS[d.name]?.full ?? formatDemographicCategoryLabel(d.name);
        let html = `<strong>${fullName}</strong><br/>`;
        for (const item of items) {
          if (item.value == null) continue;
          if (item.seriesId === 'area-suppressed') {
            html += `<span style="color:${item.color}">○</span> ${areaName}: Suppressed (small count)<br/>`;
            continue;
          }
          if (item.seriesId === 'baseline-suppressed') {
            html += `<span style="color:${item.color}">○</span> ${baselineName}: Suppressed (small count)<br/>`;
            continue;
          }
          const denom = item.seriesName === areaName ? d.areaDenominator : d.baselineDenominator;
          html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${item.value.toFixed(1)}%`;
          if (denom != null) {
            html += ` <span style="color:#666">(${denom.toLocaleString()})</span>`;
          }
          html += '<br/>';
        }
        return html;
      },
      ...nhsEChartsTheme.tooltip,
    },
    legend: isEngland ? undefined : {
      data: [areaName, baselineName],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: isEngland ? 15 : 35,
      top: 10,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: nhsEChartsTheme.xAxis.axisLine,
      axisTick: nhsEChartsTheme.xAxis.axisTick,
      axisLabel: {
        ...nhsEChartsTheme.xAxis.axisLabel,
        interval: 0,
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      max: (value: { max: number }) => Math.ceil(value.max / 5) * 5,
      axisLine: nhsEChartsTheme.yAxis.axisLine,
      axisTick: nhsEChartsTheme.yAxis.axisTick,
      splitLine: nhsEChartsTheme.yAxis.splitLine,
      axisLabel: {
        ...nhsEChartsTheme.yAxis.axisLabel,
        formatter: (v: number) => `${v}%`,
      },
    },
    series: [
      // Area bars
      {
        name: areaName,
        type: 'bar',
        data: data.map((d) => d.areaShare),
        itemStyle: { color: NHS_COLORS.blue },
        barGap: '10%',
        barMaxWidth: 30,
      },
      // Baseline markers (diamond overlay)
      ...(isEngland ? [] : [{
        name: baselineName,
        type: 'scatter',
        data: data.map((d) => d.baselineShare),
        symbol: 'diamond',
        symbolSize: 10,
        itemStyle: {
          color: NHS_COLORS.darkGrey,
          borderColor: '#fff',
          borderWidth: 1,
        },
        z: 10,
      }]),
      ...(hasAreaSuppression ? [{
        id: 'area-suppressed',
        name: 'Suppressed',
        type: 'scatter',
        data: data.map((d) => d.areaSuppressed ? 0 : null),
        symbol: 'emptyCircle',
        symbolSize: 10,
        itemStyle: { color: NHS_COLORS.orange },
        z: 12,
      }] : []),
      ...(!isEngland && hasBaselineSuppression ? [{
        id: 'baseline-suppressed',
        name: 'Suppressed',
        type: 'scatter',
        data: data.map((d) => d.baselineSuppressed ? 0 : null),
        symbol: 'emptyRect',
        symbolSize: 9,
        itemStyle: { color: NHS_COLORS.darkGrey },
        z: 12,
      }] : []),
    ],
    animationDuration: 300,
  }), [data, categories, areaName, baselineName, isEngland, hasAreaSuppression, hasBaselineSuppression]);

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height: 200, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

/** Individual profile card — extracted so each can use the useChartTableActions hook */
function ProfileCard({
  demo,
  shares,
  areaName,
  baselineName,
  isEngland,
  indicatorName,
  indicatorCode,
  areaCode,
  timePeriod,
}: {
  demo: DemographicDefinition;
  shares: CategoryShare[];
  areaName: string;
  baselineName: string;
  isEngland?: boolean;
  indicatorName?: string;
  indicatorCode?: string;
  areaCode?: string;
  timePeriod?: string;
}) {
  const fmtPct = (v: unknown) => typeof v === 'number' ? `${v.toFixed(1)}%` : String(v ?? '—');
  const fmtNum = (v: unknown) => typeof v === 'number' ? v.toLocaleString() : String(v ?? '—');
  const hasSuppression = shares.some(
    (item) => item.areaSuppressed || (!isEngland && item.baselineSuppressed)
  );

  const tableData = useMemo(() => shares.map((d) => ({
    category: DEPRIVATION_LABELS[d.name]?.full ?? formatDemographicCategoryLabel(d.name),
    areaShare: d.areaSuppressed ? 'Suppressed' : d.areaShare,
    areaDenominator: d.areaSuppressed ? 'Suppressed' : d.areaDenominator,
    ...(isEngland ? {} : {
      baselineShare: d.baselineSuppressed ? 'Suppressed' : d.baselineShare,
      baselineDenominator: d.baselineSuppressed ? 'Suppressed' : d.baselineDenominator,
    }),
  })), [shares, isEngland]);

  const tableColumns: TableColumn[] = useMemo(() => {
    const cols: TableColumn[] = [
      { key: 'category', header: demo.label.replace('By ', ''), align: 'left' },
      { key: 'areaShare', header: `${areaName} %`, align: 'right', format: fmtPct },
      { key: 'areaDenominator', header: `${areaName} Population`, align: 'right', format: fmtNum },
    ];
    if (!isEngland) {
      cols.push(
        { key: 'baselineShare', header: `${baselineName} %`, align: 'right', format: fmtPct },
        { key: 'baselineDenominator', header: `${baselineName} Population`, align: 'right', format: fmtNum },
      );
    }
    return cols;
  }, [demo.label, areaName, baselineName, isEngland]);

  const periodSlug = timePeriod?.replace(/\s+/g, '-') ?? '';
  const { viewMode, actions } = useChartTableActions({
    tableData,
    columns: tableColumns,
    filename: `population-profile-${demo.type.replace(/\s+/g, '-').toLowerCase()}${areaCode ? `-${areaCode}` : ''}${periodSlug ? `-${periodSlug}` : ''}`,
    metadata: [
      ...(indicatorName && indicatorCode ? [['Indicator', `${indicatorName} (${indicatorCode})`] as [string, string]] : []),
      ['Area', areaCode ? `${areaName} (${areaCode})` : areaName],
      ['Breakdown', `Population Profile — ${demo.label}`],
      ...(timePeriod ? [['Period', timePeriod] as [string, string]] : []),
    ],
  });

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{demo.label}</CardTitle>
          {shares.length > 0 && actions}
        </div>
        {indicatorName && (
          <CardDescription className="text-xs">{indicatorName}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ChartTableToggle
          chart={
            <ProfileChart
              data={shares}
              areaName={areaName}
              baselineName={baselineName}
              isEngland={isEngland}
            />
          }
          tableData={tableData}
          columns={tableColumns}
          viewMode={viewMode}
        />
        {hasSuppression && (
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Hollow markers show values suppressed because the underlying count is small. They do not represent 0%.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function PopulationProfile({
  areaData,
  baselineData,
  areaName = 'Selected Area',
  baselineName = 'England',
  isEngland,
  isLoading,
  indicatorName,
  indicatorCode,
  areaCode,
  timePeriod,
}: PopulationProfileProps) {
  const demographics = useMemo(
    () => getAvailableDemographics(areaData, baselineData, true),
    [areaData, baselineData]
  );

  const profiles = useMemo(() => {
    return demographics
      .map((demo) => {
        const names = getDemographicCategoryNames(
          demo.type,
          areaData,
          baselineData,
          demo.excludeCategories,
        );
        const shares = computePopulationShares(demo, areaData, baselineData, names);
        if (!shares) return null;
        return { demo, shares };
      })
      .filter(Boolean) as { demo: DemographicDefinition; shares: CategoryShare[] }[];
  }, [areaData, baselineData, demographics]);

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

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-gray-500">
            Population profile data is not available at this level.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {profiles.map(({ demo, shares }) => (
        <ProfileCard
          key={demo.type}
          demo={demo}
          shares={shares}
          areaName={areaName}
          baselineName={baselineName}
          isEngland={isEngland}
          indicatorName={indicatorName}
          indicatorCode={indicatorCode}
          areaCode={areaCode}
          timePeriod={timePeriod}
        />
      ))}
    </div>
  );
}
