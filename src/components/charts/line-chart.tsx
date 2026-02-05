'use client';

import ReactECharts from 'echarts-for-react';
import { nhsEChartsTheme, defaultChartOptions } from './chart-theme';
import { CHART_COLORS } from '@/lib/constants/colors';

// Parse "Mon YY" format to Date for sorting (e.g., "Jun 22" -> Date)
function parsePeriodDate(period: string): Date {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const match = period.match(/^([A-Za-z]{3})\s*(\d{2})$/);
  if (match) {
    const [, mon, yr] = match;
    const year = 2000 + parseInt(yr, 10);
    return new Date(year, months[mon] ?? 0, 1);
  }
  // Fallback: try parsing as-is
  return new Date(period);
}

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
  height?: number;
  /** Suffix for difference values (e.g. "pp" for percentage points) */
  diffSuffix?: string;
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
  const padding = range * 0.15 || 0.1; // 15% padding

  // Choose appropriate rounding based on data magnitude
  // Nice rounding at any scale
  const mag = Math.pow(10, Math.floor(Math.log10(maxValue || 1)));
  const res = maxValue / mag;
  const roundTo = (res <= 2 ? 0.2 : res <= 5 ? 0.5 : 1) * mag;
  const yMin = Math.max(0, Math.floor((minValue - padding) / roundTo) * roundTo);
  const yMax = Math.ceil((maxValue + padding) / roundTo) * roundTo;

  const option = {
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

            // Change from previous period
            if (xIdx > 0) {
              const prevX = xValues[xIdx - 1];
              const seriesData = series[item.seriesIndex];
              const prevPoint = seriesData?.data.find((d) => d.x === prevX);
              if (prevPoint?.y != null) {
                const change = item.value - prevPoint.y;
                const sign = change > 0 ? '+' : '';
                html += ` <span style="color:${change > 0 ? '#15803d' : change < 0 ? '#b91c1c' : '#666'}">(${sign}${change.toFixed(1)}${diffSuffix})</span>`;
              }
            }
            html += '<br/>';
          }
        }

        // Gap between series
        if (values.length === 2) {
          const gap = values[0] - values[1];
          const sign = gap > 0 ? '+' : '';
          html += `<span style="color:#666">Gap: ${sign}${gap.toFixed(1)}${diffSuffix}</span>`;
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
    grid: {
      left: '3%',
      right: '4%',
      bottom: series.length > 1 ? '15%' : '10%',
      top: title ? '15%' : '10%',
      containLabel: true,
    },
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
      nameGap: 35,
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'middle',
      nameGap: 50,
      min: yMin,
      max: yMax,
      axisLine: nhsEChartsTheme.yAxis.axisLine,
      axisTick: nhsEChartsTheme.yAxis.axisTick,
      splitLine: nhsEChartsTheme.yAxis.splitLine,
      axisLabel: {
        ...nhsEChartsTheme.yAxis.axisLabel,
        formatter: (value: number) => formatValue(value).replace(/\.0(%?)$/, '$1'),
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

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
