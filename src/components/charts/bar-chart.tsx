'use client';

import { memo, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { nhsEChartsTheme, defaultChartOptions } from './chart-theme';
import { NHS_COLORS } from '@/lib/constants/colors';

interface BarChartData {
  name: string;
  value: number | null;
  lowerCI?: number | null;
  upperCI?: number | null;
  isHighlighted?: boolean;
  numerator?: number | null;
  denominator?: number | null;
}

interface BenchmarkLine {
  value: number;
  label: string;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  benchmark?: BenchmarkLine;
  benchmarks?: BenchmarkLine[];
  formatValue?: (value: number) => string;
  height?: number;
  barColor?: string;
}

export const BarChart = memo(forwardRef<ReactECharts, BarChartProps>(function BarChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  benchmark,
  benchmarks,
  formatValue = (v) => v.toFixed(1),
  height = 400,
  barColor = NHS_COLORS.blue,
}: BarChartProps, ref) {
  const validData = data.filter((d) => d.value !== null);

  // Combine single benchmark with benchmarks array
  const allBenchmarks: BenchmarkLine[] = [
    ...(benchmarks ?? []),
    ...(benchmark && !benchmarks?.some((b) => b.value === benchmark.value) ? [benchmark] : []),
  ];

  // Calculate Y-axis scaling - include benchmark values and CI bounds
  // Bar charts should always start at 0 for honest proportions
  const barValues = validData.map((d) => d.value).filter((v): v is number => v !== null);
  const ciValues = validData.flatMap((d) => [d.upperCI]).filter((v): v is number => v != null);
  const benchmarkValues = allBenchmarks.map((b) => b.value);
  const allValues = [...barValues, ...ciValues, ...benchmarkValues];
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const hasCI = validData.some((d) => d.lowerCI != null && d.upperCI != null);
  // Nice rounding at any scale
  const mag = Math.pow(10, Math.floor(Math.log10(maxValue || 1)));
  const res = maxValue / mag;
  const roundTo = (res <= 2 ? 0.2 : res <= 5 ? 0.5 : 1) * mag;
  // Cap at 100 for percentage data
  const yMaxRaw = Math.ceil((maxValue * 1.05) / roundTo) * roundTo;
  const yMax = maxValue <= 100 ? Math.min(100, yMaxRaw) : yMaxRaw;
  const yMin = 0; // Always start at 0 for bar charts

  // Use horizontal bars when there are more than 5 items
  const useHorizontal = validData.length > 5;

  // Calculate natural height based on data
  const barHeight = 24;
  const chartHeight = useHorizontal ? Math.max(280, validData.length * barHeight + 60) : height;

  // Calculate label width based on longest name
  const maxNameLength = Math.max(...validData.map((d) => d.name.length));
  const labelWidth = Math.min(280, Math.max(180, maxNameLength * 7));

  const option: EChartsOption = {
    ...defaultChartOptions,
    grid: {
      left: useHorizontal ? 10 : '3%',
      right: '4%',
      bottom: allBenchmarks.length > 0 ? (useHorizontal ? 60 : '20%') : (useHorizontal ? 40 : '15%'),
      top: useHorizontal ? 10 : (title ? '15%' : '5%'),
      containLabel: true,
    },
    title: title
      ? {
          text: title,
          left: 'center',
          textStyle: nhsEChartsTheme.title.textStyle,
        }
      : undefined,
    legend: allBenchmarks.length > 0
      ? {
          data: allBenchmarks.map((b) => b.label),
          bottom: 0,
          itemGap: 20,
          textStyle: nhsEChartsTheme.legend.textStyle,
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as { name: string; value: number; dataIndex: number }[])[0];
        if (!p) return '';
        const item = validData[useHorizontal ? validData.length - 1 - p.dataIndex : p.dataIndex];
        let html = `<strong>${p.name}</strong><br/>`;
        html += `Value: ${formatValue(p.value)}`;
        if (item?.numerator != null && item?.denominator != null) {
          html += ` <span style="color:#666">(${item.numerator.toLocaleString()}/${item.denominator.toLocaleString()})</span>`;
        }
        if (item?.lowerCI != null && item?.upperCI != null) {
          html += `<br/>95% CI: ${formatValue(item.lowerCI)} - ${formatValue(item.upperCI)}`;
        }
        // Add benchmark comparisons
        for (const b of allBenchmarks) {
          const diff = p.value - b.value;
          const diffStr = diff >= 0 ? `+${formatValue(diff)}` : formatValue(diff);
          html += `<br/><span style="color:${b.color}">${b.label.split(':')[0]}: ${diffStr}</span>`;
        }
        return html;
      },
      ...nhsEChartsTheme.tooltip,
    },
    xAxis: useHorizontal
      ? {
          type: 'value',
          name: yAxisLabel,
          nameLocation: 'middle',
          nameGap: 25,
          min: yMin,
          max: yMax,
          axisLine: nhsEChartsTheme.xAxis.axisLine,
          axisTick: nhsEChartsTheme.xAxis.axisTick,
          splitLine: nhsEChartsTheme.xAxis.splitLine,
          axisLabel: {
            ...nhsEChartsTheme.xAxis.axisLabel,
            formatter: (value: number) => formatValue(value).replace(/\.0(%?)$/, '$1'),
          },
        }
      : {
          type: 'category',
          data: validData.map((d) => d.name),
          axisLine: nhsEChartsTheme.xAxis.axisLine,
          axisTick: nhsEChartsTheme.xAxis.axisTick,
          splitLine: nhsEChartsTheme.xAxis.splitLine,
          axisLabel: {
            ...nhsEChartsTheme.xAxis.axisLabel,
            interval: 0,
            width: 120,
            overflow: 'break',
          },
          name: xAxisLabel,
          nameLocation: 'middle',
          nameGap: 40,
        },
    yAxis: useHorizontal
      ? {
          type: 'category',
          data: [...validData].reverse().map((d) => d.name),
          axisLine: nhsEChartsTheme.yAxis.axisLine,
          axisTick: nhsEChartsTheme.yAxis.axisTick,
          axisLabel: {
            ...nhsEChartsTheme.yAxis.axisLabel,
            width: labelWidth,
            overflow: 'truncate',
          },
        }
      : {
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
    series: [
      {
        name: 'Value',
        type: 'bar',
        data: (useHorizontal ? [...validData].reverse() : validData).map((d) => ({
          value: d.value,
          itemStyle: {
            color: d.isHighlighted ? NHS_COLORS.darkBlue : barColor,
          },
        })),
        barMaxWidth: useHorizontal ? 14 : 60,
        markLine: allBenchmarks.length > 0
          ? {
              silent: true,
              symbol: 'none',
              data: allBenchmarks.map((b) => ({
                name: b.label,
                ...(useHorizontal ? { xAxis: b.value } : { yAxis: b.value }),
                lineStyle: {
                  color: b.color ?? NHS_COLORS.darkGrey,
                  type: 'dashed',
                  width: 2,
                },
                label: { show: false },
              })),
            }
          : undefined,
      },
      // Error bars (confidence intervals)
      ...(hasCI ? [{
        type: 'custom' as const,
        data: (useHorizontal ? [...validData].reverse() : validData).map((d) => [d.lowerCI ?? 0, d.upperCI ?? 0]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderItem: (params: any, api: any): any => {
          const idx = params.dataIndex;
          const lower = api.value(0);
          const upper = api.value(1);
          if (lower === 0 && upper === 0) return { type: 'group' as const, children: [] };
          const capSize = 4;

          if (useHorizontal) {
            const start = api.coord([lower, idx]);
            const end = api.coord([upper, idx]);
            return {
              type: 'group' as const,
              children: [
                { type: 'line' as const, shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] }, style: { stroke: '#333', lineWidth: 1.5 } },
                { type: 'line' as const, shape: { x1: start[0], y1: start[1] - capSize, x2: start[0], y2: start[1] + capSize }, style: { stroke: '#333', lineWidth: 1.5 } },
                { type: 'line' as const, shape: { x1: end[0], y1: end[1] - capSize, x2: end[0], y2: end[1] + capSize }, style: { stroke: '#333', lineWidth: 1.5 } },
              ],
            };
          }
          const start = api.coord([idx, lower]);
          const end = api.coord([idx, upper]);
          return {
            type: 'group' as const,
            children: [
              { type: 'line' as const, shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] }, style: { stroke: '#333', lineWidth: 1.5 } },
              { type: 'line' as const, shape: { x1: start[0] - capSize, y1: start[1], x2: start[0] + capSize, y2: start[1] }, style: { stroke: '#333', lineWidth: 1.5 } },
              { type: 'line' as const, shape: { x1: end[0] - capSize, y1: end[1], x2: end[0] + capSize, y2: end[1] }, style: { stroke: '#333', lineWidth: 1.5 } },
            ],
          };
        },
        silent: true,
        z: 10,
      }] : []),
      // Dummy series for legend display (dashed line, no marker)
      ...allBenchmarks.map((b) => ({
        name: b.label,
        type: 'line' as const,
        data: [] as number[],
        lineStyle: {
          color: b.color ?? NHS_COLORS.darkGrey,
          type: 'dashed' as const,
          width: 2,
        },
        itemStyle: {
          color: b.color ?? NHS_COLORS.darkGrey,
          opacity: 0,
        },
        symbolSize: 0,
      })),
    ],
  };

  return (
    <ReactECharts
      ref={ref}
      option={option}
      notMerge
      style={{ height: chartHeight, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}));
