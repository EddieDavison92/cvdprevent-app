'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart } from '@/components/charts/line-chart';
import { ChartTableToggle, useChartTableActions, type TableColumn } from '@/components/charts';
import type { Indicator } from '@/lib/api/types';
import { formatValue } from '@/lib/utils/format';
import { NHS_COLORS } from '@/lib/constants/colors';

interface TrendDataPoint {
  period: string;
  value: number | null;
  numerator?: number | null;
  denominator?: number | null;
}

interface TrendSectionProps {
  indicator: Indicator;
  areaTrendData: TrendDataPoint[];
  baselineTrendData: TrendDataPoint[];
  baselineName?: string;
  areaName: string;
  isLoading?: boolean;
  isEngland?: boolean;
}

export function TrendSection({
  indicator,
  areaTrendData,
  baselineTrendData,
  baselineName = 'England',
  areaName,
  isLoading,
  isEngland,
}: TrendSectionProps) {
  const formatFn = (v: number) => formatValue(v, indicator.FormatDisplayName);

  // When viewing England, areaTrendData contains England's data (no separate fetch)
  const series = isEngland
    ? [
        {
          name: 'England',
          data: areaTrendData.map((d) => ({ x: d.period, y: d.value, numerator: d.numerator, denominator: d.denominator })),
          color: NHS_COLORS.blue,
        },
      ]
    : [
        {
          name: areaName,
          data: areaTrendData.map((d) => ({ x: d.period, y: d.value, numerator: d.numerator, denominator: d.denominator })),
          color: NHS_COLORS.blue,
        },
        {
          name: baselineName,
          data: baselineTrendData.map((d) => ({ x: d.period, y: d.value, numerator: d.numerator, denominator: d.denominator })),
          color: NHS_COLORS.darkGrey,
        },
      ];

  const hasData = series.some((s) => s.data.some((d) => d.y !== null));

  const isPercentage = indicator.FormatDisplayName?.includes('%');
  const diffSuffix = isPercentage ? 'pp' : '';

  // Build table data - merge area and baseline data by period, compute gap and change
  const tableData = useMemo(() => {
    const periods = new Set([
      ...areaTrendData.map((d) => d.period),
      ...baselineTrendData.map((d) => d.period),
    ]);

    const sorted = Array.from(periods).sort();

    return sorted.map((period, idx) => {
      const areaPoint = areaTrendData.find((d) => d.period === period);
      const baselinePoint = baselineTrendData.find((d) => d.period === period);
      const areaValue = areaPoint?.value ?? null;
      const baselineValue = baselinePoint?.value ?? null;

      // Gap to baseline
      const gap = areaValue !== null && baselineValue !== null ? areaValue - baselineValue : null;

      // Change from previous period
      const prevPeriod = idx > 0 ? sorted[idx - 1] : null;
      const prevAreaPoint = prevPeriod ? areaTrendData.find((d) => d.period === prevPeriod) : null;
      const change = areaValue !== null && prevAreaPoint?.value != null
        ? areaValue - prevAreaPoint.value
        : null;

      return { period, areaValue, baselineValue, gap, change };
    });
  }, [areaTrendData, baselineTrendData]);

  const tableColumns: TableColumn[] = useMemo(() => {
    const fmtDiff = (v: unknown) => {
      if (v == null) return '—';
      const n = v as number;
      const sign = n > 0 ? '+' : '';
      return `${sign}${n.toFixed(1)}${diffSuffix}`;
    };

    const cols: TableColumn[] = [
      { key: 'period', header: 'Period', align: 'left' },
      {
        key: 'areaValue',
        header: isEngland ? 'England' : areaName,
        align: 'right',
        format: (v) => v != null ? formatFn(v as number) : '—',
      },
    ];
    if (!isEngland) {
      cols.push(
        {
          key: 'baselineValue',
          header: baselineName,
          align: 'right',
          format: (v) => v != null ? formatFn(v as number) : '—',
        },
        {
          key: 'gap',
          header: `Gap`,
          align: 'right',
          format: fmtDiff,
        },
      );
    }
    cols.push({
      key: 'change',
      header: 'Change',
      align: 'right',
      format: fmtDiff,
    });
    return cols;
  }, [isEngland, areaName, baselineName, formatFn, diffSuffix]);

  const { viewMode, actions } = useChartTableActions({
    tableData,
    columns: tableColumns,
    filename: `${indicator.IndicatorCode}-trend`,
  });

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Performance Over Time</CardTitle>
          {hasData && actions}
        </div>
        <CardDescription className="text-xs">
          {indicator.IndicatorShortName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center text-gray-400">
            Loading...
          </div>
        ) : !hasData ? (
          <div className="flex h-[200px] items-center justify-center text-gray-500">
            No trend data available
          </div>
        ) : (
          <ChartTableToggle
            chart={
              <LineChart
                series={series}
                yAxisLabel={indicator.AxisCharacter}
                formatValue={formatFn}
                height={300}
                diffSuffix={diffSuffix}
              />
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
