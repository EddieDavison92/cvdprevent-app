'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useIndicators, useIndicatorData } from '@/lib/hooks/use-indicator-data';
import { useAreas, useAllAreas } from '@/lib/hooks/use-areas';
import { useTimePeriods, useSortedTimePeriods } from '@/lib/hooks/use-time-periods';
import { filterByCategory, getIndicatorCategories, isOutcomeIndicator } from '@/lib/api/indicators';
import { getIndicatorData } from '@/lib/api/indicators';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES, getParentLevel } from '@/lib/constants/geography';
import { formatValue, formatTimePeriod } from '@/lib/utils/format';
import { NHS_COLORS } from '@/lib/constants/colors';
import { useQuery } from '@tanstack/react-query';

export default function IndicatorDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const indicatorId = parseInt(params.id as string, 10);
  const initialTimePeriod = searchParams.get('timePeriod');

  const { data: timePeriods } = useTimePeriods();
  const { data: sortedPeriods } = useSortedTimePeriods('asc');
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(
    initialTimePeriod ? parseInt(initialTimePeriod, 10) : undefined
  );
  const [selectedLevelId, setSelectedLevelId] = useState<number>(SYSTEM_LEVELS.ICB);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [scopeToParent, setScopeToParent] = useState<Area | null>(null);
  const [selectedDemographic, setSelectedDemographic] = useState<string>('Sex');

  // Fetch indicator lists for both period types to find the indicator
  const latestStdPeriod = useMemo(() => {
    if (!timePeriods) return undefined;
    return timePeriods
      .filter((p) => p.TimePeriodName.startsWith('To '))
      .sort((a, b) => new Date(b.EndDate).getTime() - new Date(a.EndDate).getTime())[0];
  }, [timePeriods]);

  const latestOutPeriod = useMemo(() => {
    if (!timePeriods) return undefined;
    return timePeriods
      .filter((p) => p.TimePeriodName.includes(' - '))
      .sort((a, b) => new Date(b.EndDate).getTime() - new Date(a.EndDate).getTime())[0];
  }, [timePeriods]);

  const { data: stdIndicators } = useIndicators(latestStdPeriod?.TimePeriodID, selectedLevelId);
  const { data: outIndicators } = useIndicators(latestOutPeriod?.TimePeriodID, selectedLevelId);

  // Determine if this indicator is standard or outcome
  const isOutcome = useMemo(() => {
    if (outIndicators?.some((i) => i.IndicatorID === indicatorId)) return true;
    return false;
  }, [outIndicators, indicatorId]);

  // Set initial period based on indicator type
  useEffect(() => {
    if (timePeriods && !selectedPeriodId) {
      const period = isOutcome ? latestOutPeriod : latestStdPeriod;
      if (period) setSelectedPeriodId(period.TimePeriodID);
    }
  }, [timePeriods, selectedPeriodId, isOutcome, latestStdPeriod, latestOutPeriod]);

  const { data: indicators } = useIndicators(selectedPeriodId, selectedLevelId);
  const indicator = indicators?.find((i) => i.IndicatorID === indicatorId);

  const { data: areas } = useAreas(selectedPeriodId, selectedLevelId);
  const { areasByLevel } = useAllAreas(selectedPeriodId);

  // Get parent level areas for scoping dropdown
  const parentLevelId = getParentLevel(selectedLevelId);
  const parentAreas = parentLevelId ? areasByLevel.get(parentLevelId) : undefined;

  const { data: indicatorData, isLoading: isLoadingData } = useIndicatorData(
    indicatorId,
    selectedPeriodId,
    selectedLevelId
  );

  // Get England data for benchmark (all demographics)
  const { data: englandData } = useIndicatorData(indicatorId, selectedPeriodId, SYSTEM_LEVELS.ENGLAND);

  // Get parent level data for benchmark
  const { data: parentLevelData } = useIndicatorData(
    indicatorId,
    selectedPeriodId,
    parentLevelId ?? undefined
  );

  // All periods of matching type for trends
  const standardPeriods = useMemo(() =>
    sortedPeriods?.filter((p) =>
      isOutcome ? p.TimePeriodName.includes(' - ') : p.TimePeriodName.startsWith('To ')
    ) ?? [],
    [sortedPeriods, isOutcome]
  );

  // Fetch trend data for selected area - parallel fetching for all periods
  const { data: trendData, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['trendData', indicatorId, selectedArea?.AreaCode, selectedLevelId, standardPeriods.length],
    queryFn: async () => {
      if (!selectedArea || standardPeriods.length === 0) return [];

      // Fetch ALL periods in parallel
      const results = await Promise.all(
        standardPeriods.map(async (period) => {
          try {
            const data = await getIndicatorData(indicatorId, period.TimePeriodID, selectedLevelId);
            const personsData = data.filter(
              (d) => d.AreaCode === selectedArea.AreaCode &&
              d.MetricCategoryTypeName === 'Sex' &&
              d.MetricCategoryName === 'Persons'
            );
            return {
              period: formatTimePeriod(period.TimePeriodName),
              value: personsData[0]?.Value ?? null,
            };
          } catch {
            return { period: formatTimePeriod(period.TimePeriodName), value: null };
          }
        })
      );
      return results;
    },
    enabled: !!selectedArea && standardPeriods.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const englandValue = useMemo(() => {
    if (!englandData) return null;
    const persons = filterByCategory(englandData, 'Sex', 'Persons');
    return persons[0]?.Value ?? null;
  }, [englandData]);

  // Get the parent area's value for comparison
  const parentValue = useMemo(() => {
    if (!parentLevelData || !scopeToParent) return null;
    const persons = filterByCategory(parentLevelData, 'Sex', 'Persons');
    const parentData = persons.find((d) => d.AreaCode === scopeToParent.AreaCode);
    return parentData?.Value ?? null;
  }, [parentLevelData, scopeToParent]);

  // Filter areas by scope
  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (!scopeToParent) return areas;
    return areas.filter((a) => a.Parents.includes(scopeToParent.AreaID));
  }, [areas, scopeToParent]);

  // Prepare chart data for comparison view
  const chartData = useMemo(() => {
    if (!indicatorData || !filteredAreas.length) return [];

    const personsData = filterByCategory(indicatorData, 'Sex', 'Persons');

    return filteredAreas
      .map((area) => {
        const areaData = personsData.find((d) => d.AreaCode === area.AreaCode);
        return {
          name: area.AreaName
            .replace(/^NHS /, '')
            .replace(/ Integrated Care Board$/, '')
            .replace(/ Primary Care Network$/, ''),
          value: areaData?.Value ?? null,
          lowerCI: areaData?.LowerCI,
          upperCI: areaData?.UpperCI,
          isHighlighted: area.AreaCode === selectedArea?.AreaCode,
        };
      })
      .filter((d) => d.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [indicatorData, filteredAreas, selectedArea]);

  // Prepare demographic breakdown data with per-category benchmarks
  const demographicChartData = useMemo(() => {
    if (!indicatorData || !selectedArea) return [];

    const areaData = indicatorData.filter((d) => d.AreaCode === selectedArea.AreaCode);
    const categories = getIndicatorCategories();
    const category = categories.find((c) => c.type === selectedDemographic);

    if (!category) return [];

    return category.categories.map((name) => {
      const item = areaData.find(
        (d) => d.MetricCategoryTypeName === selectedDemographic && d.MetricCategoryName === name
      );
      return {
        name,
        value: item?.Value ?? null,
        lowerCI: item?.LowerCI,
        upperCI: item?.UpperCI,
      };
    }).filter((d) => d.value !== null);
  }, [indicatorData, selectedArea, selectedDemographic]);

  // Get England demographic data for per-bucket comparison
  const englandDemographicData = useMemo(() => {
    if (!englandData) return new Map<string, number>();
    const map = new Map<string, number>();
    englandData
      .filter((d) => d.MetricCategoryTypeName === selectedDemographic)
      .forEach((d) => {
        if (d.Value !== null) map.set(d.MetricCategoryName, d.Value);
      });
    return map;
  }, [englandData, selectedDemographic]);

  // Get parent demographic data for per-bucket comparison
  const parentDemographicData = useMemo(() => {
    if (!parentLevelData || !scopeToParent) return new Map<string, number>();
    const map = new Map<string, number>();
    parentLevelData
      .filter((d) => d.AreaCode === scopeToParent.AreaCode && d.MetricCategoryTypeName === selectedDemographic)
      .forEach((d) => {
        if (d.Value !== null) map.set(d.MetricCategoryName, d.Value);
      });
    return map;
  }, [parentLevelData, scopeToParent, selectedDemographic]);

  // Prepare trend line data
  const trendLineData = useMemo(() => {
    if (!trendData || !selectedArea) return [];
    return [{
      name: selectedArea.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, ''),
      data: trendData.map((d) => ({ x: d.period, y: d.value })),
    }];
  }, [trendData, selectedArea]);

  // Event handlers
  const handleSelectArea = (areaCode: string) => {
    const area = areas?.find((a) => a.AreaCode === areaCode);
    if (!area) return;
    setSelectedArea(area);
    if (!scopeToParent && area.Parents.length > 0 && parentAreas) {
      const parent = parentAreas.find((p) => p.AreaID === area.Parents[0]);
      if (parent) setScopeToParent(parent);
    }
  };

  const handleScopeChange = (parentCode: string) => {
    if (parentCode === 'all') {
      setScopeToParent(null);
      setSelectedArea(null);
    } else {
      const parent = parentAreas?.find((a) => a.AreaCode === parentCode);
      if (parent) {
        setScopeToParent(parent);
        if (selectedArea && !selectedArea.Parents.includes(parent.AreaID)) {
          setSelectedArea(null);
        }
      }
    }
  };

  const formatFn = (v: number) => formatValue(v, indicator?.FormatDisplayName ?? '%');

  // Build benchmarks array - England (black), parent (red)
  const benchmarks = useMemo(() => {
    const result: { value: number; label: string; color: string }[] = [];

    // Always add England benchmark if available (black)
    if (englandValue !== null) {
      result.push({
        value: englandValue,
        label: `England: ${formatFn(englandValue)}`,
        color: NHS_COLORS.black,
      });
    }

    // Add parent benchmark when scoped (red)
    if (scopeToParent && parentValue !== null) {
      result.push({
        value: parentValue,
        label: `${scopeToParent.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')}: ${formatFn(parentValue)}`,
        color: NHS_COLORS.red,
      });
    }

    return result;
  }, [englandValue, parentValue, scopeToParent, formatFn]);

  if (!indicator) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-6 lg:grid-cols-4 mt-8">
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="lg:col-span-3">
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // PCN requires scoping - too many items nationally
  const requiresScoping = selectedLevelId === SYSTEM_LEVELS.PCN && !scopeToParent;
  const tooManyAreas = !requiresScoping && filteredAreas.length > 100;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-nhs-pale-grey/30 p-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-nhs-dark-blue">{indicator.IndicatorShortName}</h1>
                <Badge variant={isOutcomeIndicator(indicator) ? 'secondary' : 'default'}>
                  {isOutcomeIndicator(indicator) ? 'Outcome' : 'Standard'}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">{indicator.IndicatorName}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Compare</span>
              <Select
                value={selectedLevelId.toString()}
                onValueChange={(v) => {
                  setSelectedLevelId(parseInt(v, 10));
                  setSelectedArea(null);
                  setScopeToParent(null);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[SYSTEM_LEVELS.REGION, SYSTEM_LEVELS.ICB, SYSTEM_LEVELS.SUB_ICB, SYSTEM_LEVELS.PCN].map(
                    (level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {SYSTEM_LEVEL_NAMES[level]}s
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="space-y-4">
            {parentAreas && parentAreas.length > 0 && (
              <Card className={requiresScoping ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Filter by {SYSTEM_LEVEL_NAMES[parentLevelId!]}</CardTitle>
                  {requiresScoping && (
                    <CardDescription className="text-primary">Required for PCN view</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Select value={scopeToParent?.AreaCode ?? 'all'} onValueChange={handleScopeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${SYSTEM_LEVEL_NAMES[parentLevelId!]}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {!requiresScoping && <SelectItem value="all">All {SYSTEM_LEVEL_NAMES[parentLevelId!]}s</SelectItem>}
                      {parentAreas.map((parent) => (
                        <SelectItem key={parent.AreaCode} value={parent.AreaCode}>
                          {parent.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Select {SYSTEM_LEVEL_NAMES[selectedLevelId]}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedArea?.AreaCode ?? ''} onValueChange={handleSelectArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose area" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAreas.map((area) => (
                      <SelectItem key={area.AreaCode} value={area.AreaCode}>
                        {area.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '').replace(/ Primary Care Network$/, '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {englandValue !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">England</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatFn(englandValue)}</div>
                </CardContent>
              </Card>
            )}

            {selectedArea && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Selected Area</CardTitle>
                  <CardDescription>
                    {selectedArea.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const areaValue = chartData.find((d) => d.isHighlighted)?.value;
                    return areaValue !== null && areaValue !== undefined ? (
                      <div className="text-2xl font-bold text-primary">{formatFn(areaValue)}</div>
                    ) : (
                      <div className="text-muted-foreground">No data</div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="comparison">
              <TabsList className="mb-4">
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="trends" disabled={!selectedArea}>Trends</TabsTrigger>
                <TabsTrigger value="demographics" disabled={!selectedArea}>Demographics</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {scopeToParent
                        ? `${SYSTEM_LEVEL_NAMES[selectedLevelId]}s in ${scopeToParent.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')}`
                        : `All ${SYSTEM_LEVEL_NAMES[selectedLevelId]}s`}
                    </CardTitle>
                    {!requiresScoping && !tooManyAreas && (
                      <CardDescription>{chartData.length} areas - sorted by value</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {requiresScoping ? (
                      <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
                        <p>Select a {SYSTEM_LEVEL_NAMES[parentLevelId!]} to compare PCNs</p>
                        <p className="text-sm">There are over 1,400 PCNs nationally</p>
                      </div>
                    ) : tooManyAreas ? (
                      <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
                        <p>Too many areas to display ({filteredAreas.length})</p>
                        <p className="text-sm">Use the filter above to narrow down</p>
                      </div>
                    ) : isLoadingData ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <BarChart
                        data={chartData}
                        yAxisLabel={indicator.AxisCharacter}
                        benchmarks={benchmarks}
                        formatValue={formatFn}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle>Trend Over Time</CardTitle>
                    <CardDescription>
                      {selectedArea?.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')} - {standardPeriods.length} periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTrends ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !trendData || trendLineData.length === 0 || trendLineData[0].data.every((d) => d.y === null) ? (
                      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No trend data available
                      </div>
                    ) : (
                      <LineChart
                        series={trendLineData}
                        yAxisLabel={indicator.AxisCharacter}
                        formatValue={formatFn}
                        height={350}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="demographics">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Demographic Breakdown</CardTitle>
                        <CardDescription>
                          {selectedArea?.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')}
                        </CardDescription>
                      </div>
                      <Select value={selectedDemographic} onValueChange={setSelectedDemographic}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sex">Sex</SelectItem>
                          <SelectItem value="Age group">Age Group</SelectItem>
                          <SelectItem value="Deprivation quintile">Deprivation</SelectItem>
                          <SelectItem value="Ethnicity (6 categories)">Ethnicity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {demographicChartData.length === 0 ? (
                      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No demographic data available
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <BarChart
                          data={demographicChartData}
                          yAxisLabel={indicator.AxisCharacter}
                          formatValue={formatFn}
                          height={300}
                        />
                        {/* Comparison table per category */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="py-2 text-left font-medium">Category</th>
                                <th className="py-2 text-right font-medium">
                                  {selectedArea?.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '').replace(/ Primary Care Network$/, '')}
                                </th>
                                {scopeToParent && (
                                  <th className="py-2 text-right font-medium text-nhs-red">
                                    {scopeToParent.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '')}
                                  </th>
                                )}
                                <th className="py-2 text-right font-medium">England</th>
                              </tr>
                            </thead>
                            <tbody>
                              {demographicChartData.map((item) => {
                                const engVal = englandDemographicData.get(item.name);
                                const parentVal = parentDemographicData.get(item.name);
                                return (
                                  <tr key={item.name} className="border-b">
                                    <td className="py-2">{item.name}</td>
                                    <td className="py-2 text-right font-medium">{formatFn(item.value!)}</td>
                                    {scopeToParent && (
                                      <td className="py-2 text-right text-nhs-red">
                                        {parentVal !== undefined ? formatFn(parentVal) : '-'}
                                      </td>
                                    )}
                                    <td className="py-2 text-right">
                                      {engVal !== undefined ? formatFn(engVal) : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
