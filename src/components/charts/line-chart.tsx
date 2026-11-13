'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { nhsEChartsTheme, defaultChartOptions, chartGrid, AXIS_NAME_GAP } from './chart-theme';
import { NHS_COLORS, CHART_COLORS } from '@/lib/constants/colors';
import { parsePeriodDate, stripTrailingZeros } from '@/lib/utils/format';

interface LineChartDataPoint {
  x: string;
  y: number | null;
  numerator?: number | null;
  denominator?: number | null;
}

interface LineChartData {
  name: string;
  data: LineChartDataPoint[];
  color?: string;
}

interface LineChartProps {
  series: LineChartData[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
  height?: number | string;
  /** Suffix for difference values (e.g. "pp" for percentage points) */
  diffSuffix?: string;
}

function formatDifference(value: number, suffix: string) {
  const decimals = value !== 0 && Math.abs(value) < 0.1 ? 2 : 1;
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${suffix}`;
}

export function LineChart({
  series,
  title,
  xAxisLabel,
  yAxisLabel,
  formatValue = (v) => v.toFixed(1),
  height = 350,
  diffSuffix = '',
}: LineChartProps) {
  const option = useMemo(() => {
    // Get all unique x values and sort chronologically
    const allXValues = [...new Set(series.flatMap((s) => s.data.map((d) => d.x)))]
      .sort((a, b) => parsePeriodDate(a).getTime() - parsePeriodDate(b).getTime());

    // Filter to only x values where at least one series has data
    const xValues = allXValues.filter((x) =>
      series.some((s) => {
        const point = s.data.find((d) => d.x === x);
        return point?.y !== null && point?.y !== undefined;
      })
    );

    // Calculate min/max for Y-axis scaling with padding
    const allValues = series.flatMap((s) => s.data.map((d) => d.y)).filter((v): v is number => v !== null);
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const range = maxValue - minValue;
    const padding = range * 0.15 || 0.1;

    const mag = Math.pow(10, Math.floor(Math.log10(maxValue || 1)));
    const res = maxValue / mag;
    const roundTo = (res <= 2 ? 0.2 : res <= 5 ? 0.5 : 1) * mag;
    const yMin = Math.max(0, Math.floor((minValue - padding) / roundTo) * roundTo);
    const yMax = Math.ceil((maxValue + padding) / roundTo) * roundTo;

    return {
      ...defaultChartOptions,
      title: title
        ? {
            text: title,
            left: 'center',
            textStyle: nhsEChartsTheme.title.textStyle,
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; axisValue: string; color: string; seriesIndex: number }[];
          if (!items.length) return '';
          const xValue = items[0].axisValue;
          const xIdx = xValues.indexOf(xValue);
          let html = `<strong>${xValue}</strong><br/>`;

          const values: number[] = [];
          for (const item of items) {
            if (item.value !== null && item.value !== undefined) {
              values.push(item.value);
              html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${formatValue(item.value)}`;

              if (xIdx > 0) {
                const prevX = xValues[xIdx - 1];
                const seriesData = series[item.seriesIndex];
                const prevPoint = seriesData?.data.find((d) => d.x === prevX);
                if (prevPoint?.y != null) {
                  const change = item.value - prevPoint.y;
                  html += ` <span style="color:${change > 0 ? NHS_COLORS.green : change < 0 ? NHS_COLORS.red : NHS_COLORS.midGrey}">(${formatDifference(change, diffSuffix)})</span>`;
                }
              }
              html += '<br/>';
            }
          }

          if (values.length === 2) {
            const gap = values[0] - values[1];
            html += `<span style="color:${NHS_COLORS.midGrey}">Gap: ${formatDifference(gap, diffSuffix)}</span>`;
          }

          return html;
        },
        ...nhsEChartsTheme.tooltip,
      },
      legend: {
        data: series.map((s) => s.name),
        bottom: 0,
        textStyle: nhsEChartsTheme.legend.textStyle,
      },
      grid: chartGrid({
        left: '3%',
        right: '4%',
        bottom: series.length > 1 ? '15%' : '10%',
        top: title ? '15%' : '10%',
      }),
      xAxis: {
        type: 'category',
        data: xValues,
        axisLine: nhsEChartsTheme.xAxis.axisLine,
        axisTick: nhsEChartsTheme.xAxis.axisTick,
        axisLabel: {
          ...nhsEChartsTheme.xAxis.axisLabel,
          rotate: xValues.length > 8 ? 45 : 0,
        },
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: AXIS_NAME_GAP,
        nameMoveOverlap: true,
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: AXIS_NAME_GAP,
        nameMoveOverlap: true,
        min: yMin,
        max: yMax,
        axisLine: nhsEChartsTheme.yAxis.axisLine,
        axisTick: nhsEChartsTheme.yAxis.axisTick,
        splitLine: nhsEChartsTheme.yAxis.splitLine,
        axisLabel: {
          ...nhsEChartsTheme.yAxis.axisLabel,
          formatter: (value: number) => stripTrailingZeros(formatValue(value)),
        },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: 'line',
        data: xValues.map((x) => {
          const point = s.data.find((d) => d.x === x);
          return point?.y ?? null;
        }),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: s.color || CHART_COLORS[i % CHART_COLORS.length],
          width: 2,
        },
        itemStyle: {
          color: s.color || CHART_COLORS[i % CHART_COLORS.length],
        },
        connectNulls: true,
      })),
    };
  }, [series, title, xAxisLabel, yAxisLabel, formatValue, diffSuffix]);

  return (
    <ReactECharts
      option={option}
      notMerge
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
