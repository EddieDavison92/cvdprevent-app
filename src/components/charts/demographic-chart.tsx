'use client';

import ReactECharts from 'echarts-for-react';
import { nhsEChartsTheme, defaultChartOptions } from './chart-theme';
import { NHS_COLORS } from '@/lib/constants/colors';

interface DemographicChartData {
  name: string;
  orgValue: number | null;
  baselineValue: number | null;
  orgNumerator?: number | null;
  orgDenominator?: number | null;
  baselineNumerator?: number | null;
  baselineDenominator?: number | null;
}

interface DemographicChartProps {
  data: DemographicChartData[];
  orgName?: string;
  baselineName?: string;
  formatValue?: (value: number) => string;
  height?: number;
}

export function DemographicChart({
  data,
  orgName = 'Your Org',
  baselineName = 'England',
  formatValue = (v) => v.toFixed(1),
  height = 200,
}: DemographicChartProps) {
  // Check if any org values are missing (null when baseline has data)
  const hasMissingData = data.some((d) => d.orgValue === null && d.baselineValue !== null);

  // Shorten long category names for better display
  const shortenedData = data.map((d) => ({
    ...d,
    name: d.name
      .replace('1 - most deprived', '1 (most)')
      .replace('5 - least deprived', '5 (least)'),
  }));

  // Dynamic Y-axis scaling based on data range
  const allValues = data.flatMap((d) => [d.orgValue, d.baselineValue]).filter((v): v is number => v !== null);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;

  // Pick a nice step that yields ~5 ticks, works at any scale
  const yMin = 0;
  const rawStep = (maxValue * 1.15) / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const residual = rawStep / magnitude;
  const niceMultiplier = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  const step = niceMultiplier * magnitude;
  const yMaxRaw = Math.ceil(maxValue * 1.15 / step) * step;
  // Cap at 100 for percentage data
  const yMax = maxValue <= 100 ? Math.min(100, yMaxRaw) : yMaxRaw;
  const yInterval = step;

  const categories = shortenedData.map((d) => d.name);

  // Format numbers with commas
  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return 'N/A';
    return n.toLocaleString();
  };

  const option = {
    ...defaultChartOptions,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; dataIndex: number; color: string }[];
        if (!items.length) return '';
        const dataIndex = items[0].dataIndex;
        const dataItem = data[dataIndex];

        let html = `<strong>${dataItem.name}</strong><br/>`;

        for (const item of items) {
          const isOrg = item.seriesName === orgName;
          const value = item.value;
          const numerator = isOrg ? dataItem.orgNumerator : dataItem.baselineNumerator;
          const denominator = isOrg ? dataItem.orgDenominator : dataItem.baselineDenominator;

          if (value === null || value === undefined) {
            html += `<span style="color:${item.color}">●</span> ${item.seriesName}: <em>Suppressed</em><br/>`;
          } else {
            html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${formatValue(value)}`;
            if (numerator !== null && numerator !== undefined && denominator !== null && denominator !== undefined) {
              html += ` <span style="color:#666">(${formatNumber(numerator)}/${formatNumber(denominator)})</span>`;
            }
            html += '<br/>';
          }
        }
        return html;
      },
      ...nhsEChartsTheme.tooltip,
    },
    legend: {
      data: [orgName, baselineName],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: hasMissingData ? 50 : 35,
      top: 15,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: nhsEChartsTheme.xAxis.axisLine,
      axisTick: nhsEChartsTheme.xAxis.axisTick,
      axisLabel: {
        ...nhsEChartsTheme.xAxis.axisLabel,
        rotate: 0,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      interval: yInterval,
      axisLine: nhsEChartsTheme.yAxis.axisLine,
      axisTick: nhsEChartsTheme.yAxis.axisTick,
      splitLine: nhsEChartsTheme.yAxis.splitLine,
      axisLabel: {
        ...nhsEChartsTheme.yAxis.axisLabel,
        formatter: (value: number) => formatValue(value).replace(/\.0(%?)$/, '$1'),
      },
    },
    series: [
      {
        name: orgName,
        type: 'bar',
        data: shortenedData.map((d) => d.orgValue),
        itemStyle: { color: NHS_COLORS.blue },
        barGap: '10%',
        barMaxWidth: 30,
      },
      {
        name: baselineName,
        type: 'bar',
        data: shortenedData.map((d) => d.baselineValue),
        itemStyle: { color: NHS_COLORS.midGrey },
        barMaxWidth: 30,
      },
    ],
  };

  return (
    <div>
      <ReactECharts
        option={option}
        notMerge
        style={{ height, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      {hasMissingData && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Missing bars indicate suppressed data (small numbers)
        </p>
      )}
    </div>
  );
}
