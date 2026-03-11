'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart } from '@/components/charts/bar-chart';
import { ChartTableToggle, useChartTableActions, type TableColumn } from '@/components/charts';
import type { Indicator, Area, IndicatorRawData } from '@/lib/api/types';
import { SYSTEM_LEVELS } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { formatValue } from '@/lib/utils/format';
import { NHS_COLORS } from '@/lib/constants/colors';
import { cn } from '@/lib/utils';

interface PeerSectionProps {
  indicator: Indicator;
  peerData: IndicatorRawData[];
  peers: Area[];
  childrenData?: IndicatorRawData[];
  children?: Area[];
  nationalData?: IndicatorRawData[];
  nationalAreas?: Area[];
  selectedAreaCode: string;
  baselineValue: number | null;
  baselineName?: string;
  areaValue?: number | null;
  parentName?: string;
  parentValue?: number | null;
  englandValue?: number | null;
  regionValue?: number | null;
  regionName?: string;
  levelId: number;
  lowerIsBetter?: boolean;
  isLoadingPeers?: boolean;
  isLoadingChildren?: boolean;
  isLoadingNational?: boolean;
}

type ViewMode = 'peers' | 'children' | 'national';

function cleanAreaName(name: string) {
  return name
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');
}

export function PeerSection({
  indicator,
  peerData,
  peers,
  childrenData = [],
  children = [],
  nationalData = [],
  nationalAreas = [],
  selectedAreaCode,
  baselineValue,
  baselineName = 'England',
  areaValue,
  parentName,
  parentValue,
  englandValue,
  regionValue,
  regionName,
  levelId,
  lowerIsBetter = false,
  isLoadingPeers,
  isLoadingChildren,
  isLoadingNational,
}: PeerSectionProps) {
  const hasChildren = children.length > 0;
  const hasMeaningfulPeers = peers.length > 1;
  const hasNational = nationalAreas.length > 0;
  const allowNational = levelId !== SYSTEM_LEVELS.PCN && levelId !== SYSTEM_LEVELS.ENGLAND;

  const [viewMode, setViewMode] = useState<ViewMode>('peers');

  // Auto-switch based on data availability
  useEffect(() => {
    if (hasMeaningfulPeers) {
      setViewMode('peers');
    } else if (hasChildren) {
      setViewMode('children');
    }
  }, [hasMeaningfulPeers, hasChildren]);

  const formatFn = useCallback((v: number) => formatValue(v, indicator.FormatDisplayName), [indicator.FormatDisplayName]);

  // Peer chart data
  const peerChartData = useMemo(() => peers
    .map((area) => {
      const data = peerData.find(
        (d) => d.AreaCode === area.AreaCode && d.MetricCategoryTypeName === 'Sex' && d.MetricCategoryName === 'Persons'
      );
      return {
        name: cleanAreaName(area.AreaName),
        value: data?.Value ?? null,
        lowerCI: data?.LowerCI,
        upperCI: data?.UpperCI,
        numerator: data?.Numerator,
        denominator: data?.Denominator,
        isHighlighted: area.AreaCode === selectedAreaCode,
      };
    })
    .filter((d) => d.value !== null)
    .sort((a, b) => lowerIsBetter ? (a.value ?? 0) - (b.value ?? 0) : (b.value ?? 0) - (a.value ?? 0)),
  [peers, peerData, selectedAreaCode, lowerIsBetter]);

  // Children chart data
  const childrenChartData = useMemo(() => children
    .map((area) => {
      const data = childrenData.find(
        (d) => d.AreaCode === area.AreaCode && d.MetricCategoryTypeName === 'Sex' && d.MetricCategoryName === 'Persons'
      );
      return {
        name: cleanAreaName(area.AreaName),
        value: data?.Value ?? null,
        lowerCI: data?.LowerCI,
        upperCI: data?.UpperCI,
        numerator: data?.Numerator,
        denominator: data?.Denominator,
        isHighlighted: false,
      };
    })
    .filter((d) => d.value !== null)
    .sort((a, b) => lowerIsBetter ? (a.value ?? 0) - (b.value ?? 0) : (b.value ?? 0) - (a.value ?? 0)),
  [children, childrenData, lowerIsBetter]);

  // National chart data
  const nationalChartData = useMemo(() => nationalAreas
    .map((area) => {
      const data = nationalData.find((d) => d.AreaCode === area.AreaCode);
      return {
        name: cleanAreaName(area.AreaName),
        value: data?.Value ?? null,
        lowerCI: data?.LowerCI,
        upperCI: data?.UpperCI,
        numerator: data?.Numerator,
        denominator: data?.Denominator,
        isHighlighted: area.AreaCode === selectedAreaCode,
      };
    })
    .filter((d) => d.value !== null)
    .sort((a, b) => lowerIsBetter ? (a.value ?? 0) - (b.value ?? 0) : (b.value ?? 0) - (a.value ?? 0)),
  [nationalAreas, nationalData, selectedAreaCode, lowerIsBetter]);

  const childLevelId = children[0]?.SystemLevelID;
  const childLevelName = childLevelId ? SYSTEM_LEVEL_NAMES[childLevelId] : 'Children';
  const levelName = SYSTEM_LEVEL_NAMES[levelId] ?? 'area';

  // Always show region + England reference lines, avoiding duplicates
  const peerBenchmarks = useMemo(() => {
    const lines: { value: number; label: string; color: string }[] = [];
    const seen = new Set<string>();

    // Region line
    if (regionValue != null && regionName) {
      lines.push({ value: regionValue, label: `${regionName}: ${formatFn(regionValue)}`, color: NHS_COLORS.aqua });
      seen.add('region');
    } else if (parentValue != null && parentName) {
      // Fallback to parent if region not available
      lines.push({ value: parentValue, label: `${parentName}: ${formatFn(parentValue)}`, color: NHS_COLORS.aqua });
      seen.add('parent');
    }

    // England line (always show if available)
    if (englandValue != null) {
      lines.push({ value: englandValue, label: `England: ${formatFn(englandValue)}`, color: NHS_COLORS.darkGrey });
      seen.add('england');
    }

    // Baseline line only if it's something different from region/England
    if (baselineValue != null && baselineName !== 'England'
        && !(regionName && baselineName === regionName)) {
      lines.push({ value: baselineValue, label: `${baselineName}: ${formatFn(baselineValue)}`, color: NHS_COLORS.warmYellow });
    }

    return lines;
  }, [regionValue, regionName, parentValue, parentName, englandValue, baselineValue, baselineName, formatFn]);

  // Benchmarks for children
  const childrenBenchmarks = useMemo(() => {
    const lines: { value: number; label: string; color: string }[] = [];
    if (areaValue != null) {
      lines.push({ value: areaValue, label: `This area: ${formatFn(areaValue)}`, color: NHS_COLORS.blue });
    }
    if (englandValue != null) {
      lines.push({ value: englandValue, label: `England: ${formatFn(englandValue)}`, color: NHS_COLORS.darkGrey });
    }
    return lines;
  }, [areaValue, englandValue, formatFn]);

  // Benchmarks for national
  const nationalBenchmarks = useMemo(() => {
    const lines: { value: number; label: string; color: string }[] = [];
    if (englandValue != null) {
      lines.push({ value: englandValue, label: `England: ${formatFn(englandValue)}`, color: NHS_COLORS.darkGrey });
    }
    if (regionValue != null && regionName) {
      lines.push({ value: regionValue, label: `${regionName}: ${formatFn(regionValue)}`, color: NHS_COLORS.aqua });
    }
    return lines;
  }, [englandValue, regionValue, regionName, formatFn]);

  // Select active data
  const chartData = viewMode === 'peers' ? peerChartData : viewMode === 'children' ? childrenChartData : nationalChartData;
  const benchmarks = viewMode === 'peers' ? peerBenchmarks : viewMode === 'children' ? childrenBenchmarks : nationalBenchmarks;
  const isLoading = viewMode === 'peers' ? isLoadingPeers : viewMode === 'children' ? isLoadingChildren : isLoadingNational;

  // Rank for the selected view
  const selectedRank = viewMode === 'peers'
    ? peerChartData.findIndex((d) => d.isHighlighted) + 1
    : viewMode === 'national'
      ? nationalChartData.findIndex((d) => d.isHighlighted) + 1
      : 0;
  const totalInView = viewMode === 'peers' ? peerChartData.length : viewMode === 'national' ? nationalChartData.length : 0;

  // Description
  const description = viewMode === 'peers'
    ? `${indicator.IndicatorShortName} • ${parentName ? `${levelName}s in ${parentName}` : `All ${levelName}s`}${peerChartData.length > 0 ? ` (${peerChartData.length})` : ''}${selectedRank > 0 ? ` • Rank: ${selectedRank} of ${peerChartData.length}` : ''}`
    : viewMode === 'children'
      ? `${indicator.IndicatorShortName} • ${childLevelName}s within this area${childrenChartData.length > 0 ? ` (${childrenChartData.length})` : ''}`
      : `${indicator.IndicatorShortName} • All ${levelName}s nationally${nationalChartData.length > 0 ? ` (${nationalChartData.length})` : ''}${selectedRank > 0 ? ` • Rank: ${selectedRank} of ${totalInView}` : ''}`;

  // Build toggle options
  const views: { key: ViewMode; label: string; available: boolean }[] = [
    { key: 'peers', label: 'Peers', available: hasMeaningfulPeers },
    { key: 'national', label: `All ${levelName}s`, available: allowNational },
    { key: 'children', label: `${childLevelName}s`, available: hasChildren },
  ];
  const availableViews = views.filter((v) => v.available);
  const showToggle = availableViews.length > 1;

  // Table columns for chart/table toggle
  const tableColumns: TableColumn[] = useMemo(() => [
    { key: 'name', header: 'Area', align: 'left' },
    { key: 'value', header: 'Value', align: 'right', format: (v) => v != null ? formatFn(v as number) : '—' },
    { key: 'numerator', header: 'Count', align: 'right', format: (v) => v != null ? (v as number).toLocaleString() : '—' },
    { key: 'denominator', header: 'Population', align: 'right', format: (v) => v != null ? (v as number).toLocaleString() : '—' },
    { key: 'ci', header: '95% CI', align: 'right' },
  ], [formatFn]);

  // Table data from chart data
  const tableData = useMemo(() =>
    chartData.map((d) => ({
      name: d.name,
      value: d.value,
      numerator: d.numerator,
      denominator: d.denominator,
      ci: d.lowerCI != null && d.upperCI != null ? `${formatFn(d.lowerCI)} – ${formatFn(d.upperCI)}` : '—',
      isHighlighted: d.isHighlighted,
    })),
  [chartData, formatFn]);

  const { viewMode: chartViewMode, actions: chartActions } = useChartTableActions({
    tableData,
    columns: tableColumns,
    filename: `${indicator.IndicatorCode}-${viewMode}`,
  });

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {viewMode === 'peers' ? 'Comparison with Peers'
              : viewMode === 'national' ? `All ${levelName}s`
                : `${childLevelName} Breakdown`}
          </CardTitle>
          <div className="flex items-center gap-3">
            {chartData.length > 0 && chartActions}
            {showToggle && (
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {availableViews.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      viewMode === v.key
                        ? 'bg-white text-nhs-blue shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center text-gray-400">
            Loading...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-gray-500">
            {viewMode === 'peers' ? 'No peer data available'
              : viewMode === 'national' ? `No ${levelName.toLowerCase()} data available`
                : `No ${childLevelName.toLowerCase()} data available`}
          </div>
        ) : (
          <ChartTableToggle
            chart={
              <BarChart
                data={chartData}
                yAxisLabel={indicator.AxisCharacter}
                benchmarks={benchmarks}
                formatValue={formatFn}
                barColor={NHS_COLORS.lightBlue}
              />
            }
            tableData={tableData}
            columns={tableColumns}
            viewMode={chartViewMode}
          />
        )}
      </CardContent>
    </Card>
  );
}
