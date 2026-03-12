'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { nhsEChartsTheme, defaultChartOptions } from '@/components/charts/chart-theme';
import { NHS_COLORS } from '@/lib/constants/colors';
import { DEPRIVATION_LABELS } from '@/lib/api/indicators';
import type { IndicatorRawData } from '@/lib/api/types';
import { getIndicatorCategories } from '@/lib/api/indicators';

const DEMOGRAPHICS = [
  { type: 'Sex', label: 'By Sex', excludeCategories: ['Persons'] },
  { type: 'Age group', label: 'By Age Group', excludeCategories: [] },
  { type: 'Deprivation quintile', label: 'By Deprivation Quintile', excludeCategories: [] },
  { type: 'Ethnicity', label: 'By Ethnicity', excludeCategories: [] },
];

interface PopulationProfileProps {
  areaData: IndicatorRawData[];
  baselineData: IndicatorRawData[];
  areaName?: string;
  baselineName?: string;
  isEngland?: boolean;
  isLoading?: boolean;
}

interface CategoryShare {
  name: string;
  shortName: string;
  areaShare: number | null;
  baselineShare: number | null;
  areaDenominator: number | null;
  baselineDenominator: number | null;
}

function computeShares(
  demo: typeof DEMOGRAPHICS[0],
  areaData: IndicatorRawData[],
  baselineData: IndicatorRawData[],
  categories: ReturnType<typeof getIndicatorCategories>,
): CategoryShare[] | null {
  const category = categories.find((c) => c.type === demo.type);
  if (!category) return null;

  const relevantCategories = category.categories.filter(
    (name) => !demo.excludeCategories.includes(name)
  );

  const items = relevantCategories.map((name) => {
    const item = areaData.find(
      (d) => d.MetricCategoryTypeName === demo.type && d.MetricCategoryName === name
    );
    const baseItem = baselineData.find(
      (d) => d.MetricCategoryTypeName === demo.type && d.MetricCategoryName === name
    );
    return {
      name,
      areaDenominator: item?.Denominator ?? null,
      baselineDenominator: baseItem?.Denominator ?? null,
    };
  });

  // Require area denominator data (mirrors demographics breakdown visibility)
  const hasAreaData = items.some((d) => d.areaDenominator !== null);
  if (!hasAreaData) return null;

  const areaTotal = items.reduce((sum, d) => sum + (d.areaDenominator ?? 0), 0);
  const baselineTotal = items.reduce((sum, d) => sum + (d.baselineDenominator ?? 0), 0);

  return items.map((d) => ({
    name: d.name,
    shortName: DEPRIVATION_LABELS[d.name]?.short ?? d.name,
    areaShare: areaTotal > 0 && d.areaDenominator !== null
      ? (d.areaDenominator / areaTotal) * 100
      : null,
    baselineShare: baselineTotal > 0 && d.baselineDenominator !== null
      ? (d.baselineDenominator / baselineTotal) * 100
      : null,
    areaDenominator: d.areaDenominator,
    baselineDenominator: d.baselineDenominator,
  }));
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
  const categories = data.map((d) => d.shortName);

  const option = useMemo(() => ({
    ...defaultChartOptions,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const items = params as { dataIndex: number; seriesName: string; value: number | null; color: string }[];
        if (!items.length) return '';
        const d = data[items[0].dataIndex];
        const fullName = DEPRIVATION_LABELS[d.name]?.full ?? d.name;
        let html = `<strong>${fullName}</strong><br/>`;
        for (const item of items) {
          if (item.value == null) continue;
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
    ],
    animationDuration: 300,
  }), [data, categories, areaName, baselineName, isEngland]);

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

export function PopulationProfile({
  areaData,
  baselineData,
  areaName = 'Selected Area',
  baselineName = 'England',
  isEngland,
  isLoading,
}: PopulationProfileProps) {
  const categories = getIndicatorCategories();

  const profiles = useMemo(() => {
    return DEMOGRAPHICS
      .map((demo) => {
        const shares = computeShares(demo, areaData, baselineData, categories);
        if (!shares) return null;
        return { demo, shares };
      })
      .filter(Boolean) as { demo: typeof DEMOGRAPHICS[0]; shares: CategoryShare[] }[];
  }, [areaData, baselineData, categories]);

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

  if (profiles.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {profiles.map(({ demo, shares }) => (
        <Card key={demo.type} className="gap-2 py-4">
          <CardHeader className="gap-1">
            <CardTitle className="text-base">{demo.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileChart
              data={shares}
              areaName={areaName}
              baselineName={baselineName}
              isEngland={isEngland}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
