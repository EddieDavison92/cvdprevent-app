'use client';

import ReactECharts from 'echarts-for-react';
import { nhsEChartsTheme, defaultChartOptions } from './chart-theme';
import { NHS_COLORS, COMPARISON_COLORS } from '@/lib/constants/colors';

interface ComparisonData {
  name: string;
  value: number | null;
  lowerCI?: number | null;
  upperCI?: number | null;
  type: 'selected' | 'peer' | 'parent' | 'benchmark';
}

interface ComparisonChartProps {
  data: ComparisonData[];
  title?: string;
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
  height?: number;
}

const TYPE_COLORS: Record<string, string> = {
  selected: COMPARISON_COLORS.primary,
  peer: COMPARISON_COLORS.peer,
  parent: COMPARISON_COLORS.parent,
  benchmark: COMPARISON_COLORS.benchmark,
};

export function ComparisonChart({
  data,
  title,
  yAxisLabel,
  formatValue = (v) => v.toFixed(1),
  height = 400,
}: ComparisonChartProps) {
  const validData = data.filter((d) => d.value !== null);

  // Sort: selected first, then peers, then parents, then benchmark
  const typeOrder = ['selected', 'peer', 'parent', 'benchmark'];
  const sortedData = [...validData].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  );

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
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: unknown) => {
        const p = (params as { name: string; value: number; dataIndex: number }[])[0];
        if (!p) return '';
        const item = sortedData[p.dataIndex];
        let html = `<strong>${p.name}</strong><br/>`;
        html += `Value: ${formatValue(p.value)}`;
        if (item?.lowerCI != null && item?.upperCI != null) {
          html += `<br/>95% CI: ${formatValue(item.lowerCI)} - ${formatValue(item.upperCI)}`;
        }
        return html;
      },
      ...nhsEChartsTheme.tooltip,
    },
    legend: {
      show: false,
    },
    xAxis: {
      type: 'category',
      data: sortedData.map((d) => d.name),
      axisLine: nhsEChartsTheme.xAxis.axisLine,
      axisTick: nhsEChartsTheme.xAxis.axisTick,
      splitLine: nhsEChartsTheme.xAxis.splitLine,
      axisLabel: {
        ...nhsEChartsTheme.xAxis.axisLabel,
        rotate: sortedData.length > 5 ? 45 : 0,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'middle',
      nameGap: 50,
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
        type: 'bar',
        data: sortedData.map((d) => ({
          value: d.value,
          itemStyle: {
            color: TYPE_COLORS[d.type] || NHS_COLORS.midGrey,
          },
        })),
        barMaxWidth: 60,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
