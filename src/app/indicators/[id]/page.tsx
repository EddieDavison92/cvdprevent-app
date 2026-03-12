'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { ChartTableToggle, useChartTableActions, type TableColumn } from '@/components/charts';
import { DemographicsGrid } from '@/components/indicator-detail/demographics-grid';
import { PopulationProfile } from '@/components/indicator-detail/population-profile';
import { IndicatorNav } from '@/components/indicator-detail/indicator-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAreaIndicators, getPersonsData } from '@/lib/hooks/use-area-indicators';
import { isOutcomeIndicator } from '@/lib/api';
import { useIndicatorData } from '@/lib/hooks/use-indicator-data';
import { useAreas } from '@/lib/hooks/use-areas';
import { SYSTEM_LEVELS, type IndicatorRawData, type IndicatorWithData } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES, getParentLevel } from '@/lib/constants/geography';
import { findSectionForIndicator } from '@/lib/constants/indicator-sections';
import { formatValue, formatTimePeriod } from '@/lib/utils/format';
import { NHS_COLORS } from '@/lib/constants/colors';
import { cn } from '@/lib/utils';
import type { Area } from '@/lib/api/types';

const LEVEL_OPTIONS = [
  { id: SYSTEM_LEVELS.REGION, label: 'Regions' },
  { id: SYSTEM_LEVELS.ICB, label: 'ICBs' },
  { id: SYSTEM_LEVELS.SUB_ICB, label: 'Sub-ICBs' },
  { id: SYSTEM_LEVELS.PCN, label: 'PCNs' },
];

function cleanAreaName(name: string) {
  return name
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');
}

function SelectedAreaCard({ area, value, rank, lowerIsBetter, formatFn }: {
  area: Area;
  value: number;
  rank: { position: number; total: number } | null;
  lowerIsBetter: boolean;
  formatFn: (v: number) => string;
}) {
  // Chart sorts highest value first. For lowerIsBetter, high rank = worst.
  let performance: 'top' | 'bottom' | 'mid' = 'mid';
  if (rank) {
    const inTopQuartile = rank.position <= Math.ceil(rank.total * 0.25);
    const inBottomQuartile = rank.position > Math.ceil(rank.total * 0.75);
    if (inTopQuartile) performance = lowerIsBetter ? 'bottom' : 'top';
    else if (inBottomQuartile) performance = lowerIsBetter ? 'top' : 'bottom';
  }

  const style = performance === 'top'
    ? { card: 'bg-green-50 border-green-200', value: 'text-green-700', rank: 'text-green-700', label: 'Top quartile' }
    : performance === 'bottom'
    ? { card: 'bg-red-50 border-red-200', value: 'text-red-700', rank: 'text-red-700', label: 'Bottom quartile' }
    : { card: 'bg-gray-50', value: 'text-nhs-blue', rank: 'text-gray-500', label: null };

  return (
    <Card className={style.card}>
      <CardContent className="p-3">
        <div className="text-xs text-gray-500 mb-0.5">{cleanAreaName(area.AreaName)}</div>
        <div className={cn('text-xl font-bold', style.value)}>{formatFn(value)}</div>
        {rank && (
          <div className={cn('text-xs font-medium mt-0.5', style.rank)}>
            {style.label ? `${style.label} · ` : ''}Rank {rank.position} of {rank.total}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function convertToRawData(
  indicator: IndicatorWithData,
  category: IndicatorWithData['Categories'][0],
  areaCode = '',
): IndicatorRawData {
  return {
    IndicatorID: indicator.IndicatorID,
    AreaCode: areaCode,
    AreaName: '',
    TimePeriodID: category.Data.TimePeriodID,
    TimePeriodName: '',
    MetricCategoryTypeName: category.MetricCategoryTypeName,
    MetricCategoryName: category.MetricCategoryName,
    Numerator: category.Data.Numerator,
    Denominator: category.Data.Denominator,
    Value: category.Data.Value,
    LowerCI: category.Data.LowerConfidenceLimit,
    UpperCI: category.Data.UpperConfidenceLimit,
    ComparedToEnglandValue: null,
    ComparedToEnglandID: null,
  };
}

export default function IndicatorExplorePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const indicatorId = parseInt(params.id as string, 10);

  // Initialise from URL params (passed from benchmarks/other pages)
  const initialLevel = searchParams.get('level');
  const initialParent = searchParams.get('parent');
  const initialArea = searchParams.get('area');

  const [levelId, setLevelId] = useState<number>(
    initialLevel ? parseInt(initialLevel, 10) : SYSTEM_LEVELS.ICB,
  );
  const [scopeParentId, setScopeParentId] = useState<number | undefined>(
    initialParent ? parseInt(initialParent, 10) : undefined,
  );
  const [selectedAreaCode, setSelectedAreaCode] = useState<string | undefined>(
    initialArea ?? undefined,
  );

  // --- Time periods ---
  const { data: stdPeriod } = useLatestTimePeriod('standard');
  const { data: outPeriod } = useLatestTimePeriod('outcome');

  // --- England data (all indicators, one call per period type) ---
  const { data: engStdInds, isLoading: isLoadingEngStd } = useAreaIndicators(stdPeriod?.TimePeriodID, 1);
  const { data: engOutInds, isLoading: isLoadingEngOut } = useAreaIndicators(outPeriod?.TimePeriodID, 1);

  const allEnglandInds = useMemo(
    () => [...(engStdInds ?? []), ...(engOutInds ?? [])],
    [engStdInds, engOutInds],
  );
  const isLoadingEngland = isLoadingEngStd || isLoadingEngOut;

  // --- Current indicator ---
  const indicator = useMemo(
    () => allEnglandInds.find(i => i.IndicatorID === indicatorId),
    [allEnglandInds, indicatorId],
  );

  const isOutcome = indicator ? isOutcomeIndicator(indicator) : false;
  const periodId = isOutcome ? outPeriod?.TimePeriodID : stdPeriod?.TimePeriodID;
  const section = indicator ? findSectionForIndicator(indicator.IndicatorCode) : undefined;

  const formatFn = useCallback(
    (v: number) => formatValue(v, indicator?.FormatDisplayName ?? ''),
    [indicator?.FormatDisplayName],
  );

  // England value + trend from the pre-fetched data
  const { englandValue, englandTrend } = useMemo(() => {
    if (!indicator) return { englandValue: null, englandTrend: [] };
    const persons = getPersonsData(indicator);
    return {
      englandValue: persons?.Data.Value ?? null,
      englandTrend: persons?.TimeSeries
        ?.slice()
        .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime())
        .map(p => ({ period: formatTimePeriod(p.TimePeriodName), value: p.Value }))
        ?? [],
    };
  }, [indicator]);

  // --- Indicator nav data ---
  const navIndicators = useMemo(() =>
    allEnglandInds
      .map(ind => ({
        IndicatorID: ind.IndicatorID,
        IndicatorCode: ind.IndicatorCode,
        IndicatorName: ind.IndicatorName,
        IndicatorShortName: ind.IndicatorShortName,
        IndicatorOrder: ind.IndicatorOrder,
        FormatDisplayName: ind.FormatDisplayName,
        IndicatorFormatID: ind.IndicatorFormatID,
        AxisCharacter: ind.AxisCharacter,
        DataUpdateInterval: null,
        IndicatorStatus: null,
        HighestPriorityNotificationType: null,
        NotificationCount: 0,
      }))
      .sort((a, b) => a.IndicatorOrder - b.IndicatorOrder),
    [allEnglandInds],
  );

  const navDataByIndicator = useMemo(() => {
    const map = new Map<number, IndicatorRawData>();
    allEnglandInds.forEach(ind => {
      const persons = getPersonsData(ind);
      if (persons) {
        map.set(ind.IndicatorID, convertToRawData(ind, persons, 'E92000001'));
      }
    });
    return map;
  }, [allEnglandInds]);

  // --- Area-level data ---
  const { data: areaLevelData, isLoading: isLoadingAreaData } = useIndicatorData(
    indicatorId, periodId, levelId,
  );
  const { data: areas } = useAreas(periodId, levelId);

  // Scope: PCN → ICB (matching benchmarks page), others → natural parent
  const isPcn = levelId === SYSTEM_LEVELS.PCN;
  const scopeLevelId = isPcn
    ? SYSTEM_LEVELS.ICB
    : levelId === SYSTEM_LEVELS.REGION ? null : getParentLevel(levelId);
  const { data: scopeAreas } = useAreas(periodId, scopeLevelId ?? undefined);
  const { data: subIcbs } = useAreas(
    periodId,
    isPcn ? SYSTEM_LEVELS.SUB_ICB : undefined,
  );

  // Scope parent data for benchmark line
  const { data: scopeLevelData } = useIndicatorData(
    indicatorId, periodId, scopeLevelId ?? undefined,
  );

  // Filter areas by scope
  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (!scopeParentId) return isPcn ? [] : areas;
    if (isPcn && subIcbs) {
      const subIcbIds = new Set(
        subIcbs.filter(s => s.Parents?.includes(scopeParentId)).map(s => s.AreaID),
      );
      return areas.filter(a => a.Parents?.some(p => subIcbIds.has(p)));
    }
    return areas.filter(a => a.Parents?.includes(scopeParentId));
  }, [areas, isPcn, scopeParentId, subIcbs]);

  const scopeParent = scopeAreas?.find(a => a.AreaID === scopeParentId);
  const scopeParentValue = useMemo(() => {
    if (!scopeLevelData || !scopeParent) return null;
    const d = scopeLevelData.find(
      d => d.AreaCode === scopeParent.AreaCode &&
        d.MetricCategoryTypeName === 'Sex' && d.MetricCategoryName === 'Persons',
    );
    return d?.Value ?? null;
  }, [scopeLevelData, scopeParent]);

  // Benchmarks for bar chart
  const benchmarks = useMemo(() => {
    const lines: { value: number; label: string; color: string }[] = [];
    if (englandValue != null) {
      lines.push({ value: englandValue, label: `England: ${formatFn(englandValue)}`, color: NHS_COLORS.darkGrey });
    }
    if (scopeParent && scopeParentValue != null) {
      lines.push({
        value: scopeParentValue,
        label: `${cleanAreaName(scopeParent.AreaName)}: ${formatFn(scopeParentValue)}`,
        color: NHS_COLORS.aqua,
      });
    }
    return lines;
  }, [englandValue, scopeParentValue, scopeParent, formatFn]);

  // Build chart data
  const chartData = useMemo(() => {
    if (!areaLevelData || !filteredAreas.length) return [];
    const personsData = areaLevelData.filter(
      d => d.MetricCategoryTypeName === 'Sex' && d.MetricCategoryName === 'Persons',
    );
    return filteredAreas
      .map(area => {
        const data = personsData.find(d => d.AreaCode === area.AreaCode);
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
      .filter(d => d.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [areaLevelData, filteredAreas, selectedAreaCode]);

  // Summary stats
  const stats = useMemo(() => {
    const values = chartData.map(d => d.value).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      range: sorted[sorted.length - 1] - sorted[0],
    };
  }, [chartData]);

  // Table for ChartTableToggle
  const tableColumns: TableColumn[] = useMemo(() => [
    { key: 'name', header: 'Area', align: 'left' },
    { key: 'value', header: 'Value', align: 'right', format: v => v != null ? formatFn(v as number) : '—' },
    { key: 'numerator', header: 'Count', align: 'right', format: v => v != null ? (v as number).toLocaleString() : '—' },
    { key: 'denominator', header: 'Population', align: 'right', format: v => v != null ? (v as number).toLocaleString() : '—' },
    { key: 'ci', header: '95% CI', align: 'right' },
  ], [formatFn]);

  const tableData = useMemo(() =>
    chartData.map(d => ({
      name: d.name,
      value: d.value,
      numerator: d.numerator,
      denominator: d.denominator,
      ci: d.lowerCI != null && d.upperCI != null ? `${formatFn(d.lowerCI)} – ${formatFn(d.upperCI)}` : '—',
      isHighlighted: d.isHighlighted,
    })),
    [chartData, formatFn],
  );

  const activePeriod = isOutcome ? outPeriod : stdPeriod;
  const periodLabel = activePeriod ? formatTimePeriod(activePeriod.TimePeriodName) : '';
  const periodSlug = periodLabel.replace(/\s+/g, '-');
  const { viewMode: chartViewMode, actions: chartActions } = useChartTableActions({
    tableData,
    columns: tableColumns,
    filename: `${indicator?.IndicatorCode ?? 'indicator'}-${SYSTEM_LEVEL_NAMES[levelId]?.toLowerCase().replace(/\s+/g, '-') ?? 'areas'}${periodSlug ? `-${periodSlug}` : ''}`,
    metadata: indicator ? [
      ['Indicator', `${indicator.IndicatorShortName} (${indicator.IndicatorCode})`],
      ['Area Type', SYSTEM_LEVEL_NAMES[levelId] ?? 'Unknown'],
      ...(periodLabel ? [['Period', periodLabel] as [string, string]] : []),
    ] : undefined,
  });

  // --- Selected area ---
  const selectedArea = useMemo(
    () => areas?.find(a => a.AreaCode === selectedAreaCode),
    [areas, selectedAreaCode],
  );

  // Fetch selected area's full data (includes time series for trend)
  const { data: selectedAreaInds, isLoading: isLoadingSelectedArea } = useAreaIndicators(
    periodId, selectedArea?.AreaID,
  );

  const selectedAreaValue = useMemo(() => {
    if (!selectedAreaCode) return null;
    return chartData.find(d => d.isHighlighted)?.value ?? null;
  }, [chartData, selectedAreaCode]);

  const selectedRank = useMemo(() => {
    if (!selectedAreaCode) return null;
    const idx = chartData.findIndex(d => d.isHighlighted);
    return idx >= 0 ? { position: idx + 1, total: chartData.length } : null;
  }, [chartData, selectedAreaCode]);

  // Selected area trend
  const selectedAreaTrend = useMemo(() => {
    if (!selectedAreaInds) return [];
    const ind = selectedAreaInds.find(i => i.IndicatorID === indicatorId);
    if (!ind) return [];
    const persons = getPersonsData(ind);
    return persons?.TimeSeries
      ?.slice()
      .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime())
      .map(p => ({ period: formatTimePeriod(p.TimePeriodName), value: p.Value }))
      ?? [];
  }, [selectedAreaInds, indicatorId]);

  // Trend series (England always + selected area when available)
  const trendSeries = useMemo(() => {
    const series = [];
    if (englandTrend.length > 0) {
      series.push({
        name: 'England',
        data: englandTrend.map(d => ({ x: d.period, y: d.value })),
        color: NHS_COLORS.darkGrey,
      });
    }
    if (selectedArea && selectedAreaTrend.length > 0) {
      series.push({
        name: cleanAreaName(selectedArea.AreaName),
        data: selectedAreaTrend.map(d => ({ x: d.period, y: d.value })),
        color: NHS_COLORS.blue,
      });
    }
    return series;
  }, [englandTrend, selectedAreaTrend, selectedArea]);

  // Area demographics — show selected area vs England, or England alone
  const { areaDemo, englandDemo } = useMemo(() => {
    if (!indicator) return { areaDemo: [], englandDemo: [] };
    const engData = indicator.Categories.map(cat => convertToRawData(indicator, cat, 'E92000001'));
    if (selectedAreaCode && areaLevelData) {
      return {
        areaDemo: areaLevelData.filter(d => d.AreaCode === selectedAreaCode),
        englandDemo: engData,
      };
    }
    // No area selected — show England demographics
    return { areaDemo: engData, englandDemo: engData };
  }, [selectedAreaCode, areaLevelData, indicator]);

  // Convert for DemographicsGrid
  const indicatorForComponents = useMemo(() => indicator ? ({
    ...indicator,
    DataUpdateInterval: indicator.DataUpdateInterval ?? null,
    IndicatorStatus: indicator.IndicatorStatus ?? null,
    HighestPriorityNotificationType: indicator.HighestPriorityNotificationType ?? null,
    NotificationCount: indicator.NotificationCount ?? 0,
  }) : null, [indicator]);

  const levelName = SYSTEM_LEVEL_NAMES[levelId] ?? 'area';
  const scopeLevelName = scopeLevelId ? SYSTEM_LEVEL_NAMES[scopeLevelId] : '';
  const requiresScoping = isPcn && !scopeParentId;

  // --- Loading / not found ---
  if (isLoadingEngland && !indicator) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-nhs-pale-grey/30 p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="flex gap-2 mt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-24" />)}</div>
            <Skeleton className="h-[400px] mt-4" />
          </div>
        </main>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-nhs-pale-grey/30 p-6">
          <div className="mx-auto max-w-6xl text-center py-20">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Indicator not found</h1>
            <p className="text-gray-500 mb-4">This indicator may not be available for the current time period.</p>
            <Link href="/indicators">
              <Button>Back to Indicators</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-nhs-pale-grey/30 p-6">
        <div className="mx-auto max-w-6xl">
          {/* Back link */}
          <Link href="/indicators">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indicators
            </Button>
          </Link>

          {/* Indicator header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-nhs-dark-blue">{indicator.IndicatorShortName}</h1>
              <Badge variant={isOutcome ? 'secondary' : 'default'}>
                {isOutcome ? 'Outcome' : 'Standard'}
              </Badge>
              {section && (
                <Badge variant="outline">
                  {section.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 max-w-3xl">{indicator.IndicatorName}</p>
            {(isOutcome ? outPeriod : stdPeriod) && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatTimePeriod((isOutcome ? outPeriod! : stdPeriod!).TimePeriodName)}
              </div>
            )}
          </div>

          {/* Indicator quick-switch nav */}
          {navIndicators.length > 0 && (
            <IndicatorNav
              indicators={navIndicators}
              currentId={indicatorId}
              dataByIndicator={navDataByIndicator}
              basePath="/indicators"
            />
          )}

          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select
              value={levelId.toString()}
              onValueChange={v => {
                setLevelId(parseInt(v, 10));
                setScopeParentId(undefined);
                setSelectedAreaCode(undefined);
              }}
            >
              <SelectTrigger className="w-[140px] h-9 text-sm bg-white" aria-label="Geography level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map(l => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {scopeAreas && scopeAreas.length > 0 && (
              <Select
                value={scopeParentId?.toString() ?? 'all'}
                onValueChange={v => {
                  setScopeParentId(v === 'all' ? undefined : parseInt(v, 10));
                  setSelectedAreaCode(undefined);
                }}
              >
                <SelectTrigger className="w-[240px] h-9 text-sm bg-white" aria-label="Parent scope">
                  <SelectValue placeholder={isPcn ? `Select ${scopeLevelName}...` : `All ${scopeLevelName}s`} />
                </SelectTrigger>
                <SelectContent>
                  {!isPcn && <SelectItem value="all">All {scopeLevelName}s</SelectItem>}
                  {scopeAreas.sort((a, b) => a.AreaName.localeCompare(b.AreaName)).map(area => (
                    <SelectItem key={area.AreaID} value={area.AreaID.toString()}>
                      {cleanAreaName(area.AreaName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="h-6 w-px bg-gray-300" />

            <Select
              value={selectedAreaCode ?? 'none'}
              onValueChange={v => setSelectedAreaCode(v === 'none' ? undefined : v)}
            >
              <SelectTrigger className="w-[260px] h-9 text-sm bg-white" aria-label="Highlight area">
                <SelectValue placeholder="Select area to highlight..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No area selected</SelectItem>
                {filteredAreas
                  .sort((a, b) => a.AreaName.localeCompare(b.AreaName))
                  .map(area => (
                    <SelectItem key={area.AreaCode} value={area.AreaCode}>
                      {cleanAreaName(area.AreaName)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary stats */}
          {stats && englandValue != null && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-0.5">England</div>
                  <div className="text-xl font-bold text-nhs-blue">{formatFn(englandValue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-0.5">{levelName}s with data</div>
                  <div className="text-xl font-bold text-gray-900">{stats.count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-0.5">Range</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatFn(stats.min)} – {formatFn(stats.max)}
                  </div>
                </CardContent>
              </Card>
              {selectedArea && selectedAreaValue != null ? (
                <SelectedAreaCard
                  area={selectedArea}
                  value={selectedAreaValue}
                  rank={selectedRank}
                  lowerIsBetter={section?.lowerIsBetter ?? false}
                  formatFn={formatFn}
                />
              ) : (
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-gray-500 mb-0.5">Spread</div>
                    <div className="text-xl font-bold text-gray-900">{formatFn(stats.range)}</div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Main ranking chart */}
          <Card className="mb-6 gap-2 py-4">
            <CardHeader className="gap-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {scopeParent
                    ? `${levelName}s in ${cleanAreaName(scopeParent.AreaName)}`
                    : `All ${levelName}s`}
                </CardTitle>
                {chartData.length > 0 && chartActions}
              </div>
              <CardDescription>
                {indicator.IndicatorShortName}
                {chartData.length > 0 ? ` • ${chartData.length} areas ranked by value` : ''}
                {section?.lowerIsBetter ? ' • Lower is better' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requiresScoping ? (
                <div className="flex h-[200px] items-center justify-center text-gray-400">
                  Select an {scopeLevelName} above to view {levelName}s
                </div>
              ) : isLoadingAreaData ? (
                <div className="flex h-[300px] items-center justify-center text-gray-400">
                  Loading...
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-gray-400">
                  No data available at {levelName} level
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

          {/* Trend (England always, + selected area) */}
          {trendSeries.length > 0 && (
            <Card className="mb-6 gap-2 py-4">
              <CardHeader className="gap-1">
                <CardTitle className="text-lg">Trend Over Time</CardTitle>
                <CardDescription>
                  {selectedArea
                    ? `${cleanAreaName(selectedArea.AreaName)} vs England`
                    : 'England average'}
                  {isLoadingSelectedArea && selectedArea ? ' • Loading area trend...' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  series={trendSeries}
                  yAxisLabel={indicator.AxisCharacter}
                  formatValue={formatFn}
                  height={300}
                />
              </CardContent>
            </Card>
          )}

          {/* Demographics */}
          {indicatorForComponents && areaDemo.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-1 text-lg font-semibold text-nhs-dark-blue">
                Demographic Breakdowns — {selectedArea ? cleanAreaName(selectedArea.AreaName) : 'England'}
              </h2>
              <p className="mb-4 text-sm text-gray-500">How indicator outcomes vary across demographic groups</p>
              <DemographicsGrid
                indicator={indicatorForComponents}
                areaData={areaDemo}
                baselineData={englandDemo}
                baselineName="England"
                areaName={selectedArea ? cleanAreaName(selectedArea.AreaName) : 'England'}
                areaCode={selectedArea?.AreaCode}
                timePeriod={periodLabel}
                isEngland={!selectedArea}
                isLoading={false}
              />
            </div>
          )}

          {/* Population Profile */}
          {areaDemo.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-1 text-lg font-semibold text-nhs-dark-blue">
                Population Profile — {selectedArea ? cleanAreaName(selectedArea.AreaName) : 'England'}
              </h2>
              <p className="mb-4 text-sm text-gray-500">How the eligible population is distributed across demographic groups</p>
              <PopulationProfile
                areaData={areaDemo}
                baselineData={englandDemo}
                areaName={selectedArea ? cleanAreaName(selectedArea.AreaName) : 'England'}
                baselineName="England"
                isEngland={!selectedArea}
                isLoading={false}
                indicatorName={indicator.IndicatorShortName}
                indicatorCode={indicator.IndicatorCode}
                areaCode={selectedAreaCode}
                timePeriod={periodLabel}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
