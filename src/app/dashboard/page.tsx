'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import {
  OrganisationHeader,
  QuickStats,
  QualityImprovementExplorer,
  ConditionFilter,
  BaselineSelector,
  SectionView,
  PrioritiesCard,
  TrendsView,
  AreaChangeDialog,
} from '@/components/dashboard';
import { OverviewSkeleton, TrendsSkeleton, PathwaysSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { Footer } from '@/components/layout/footer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PathwayOverview } from '@/components/pathways';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAreaIndicators, getPersonsData } from '@/lib/hooks/use-area-indicators';
import { extractCondition } from '@/lib/utils/format';
import { getDashboardSections, isLowerBetterIndicator } from '@/lib/constants/indicator-sections';
import { COMPARISON_TOLERANCE } from '@/lib/constants/comparison';
import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';
import { ApiUnavailable } from '@/components/api-status-banner';
import { getTrendDirection } from '@/lib/utils/trend';

// Convert new data format to the format expected by IndicatorSummaryGrid
function convertToRawDataFormat(category: IndicatorCategoryData, indicator: IndicatorWithData) {
  return {
    IndicatorID: indicator.IndicatorID,
    AreaCode: '',
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

export default function DashboardPage() {
  const router = useRouter();
  const { organisation, isEngland, isLoading: isLoadingOrg, baseline } = useOrganisation();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Tab state from URL
  const defaultTab = isEngland ? 'trends' : 'overview';
  const currentTab = searchParams.get('tab') || defaultTab;
  const setCurrentTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const defTab = isEngland ? 'trends' : 'overview';
    if (tab === defTab) {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    // Clear condition filter when switching tabs
    params.delete('condition');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, isEngland]);

  // Show below average only toggle
  const [showBelowOnly, setShowBelowOnly] = useState(false);

  // Get clean baseline name for display
  const baselineName = useMemo(() => {
    if (baseline.SystemLevelID === 1) return 'England';
    return baseline.AreaName
      .replace(/^NHS /, '')
      .replace(/ Integrated Care Board$/, '')
      .replace(/ Primary Care Network$/, '')
      .replace(/ - [A-Z0-9]+$/, '');
  }, [baseline]);

  // Condition filter driven by URL (for All Indicators tab)
  const selectedCondition = searchParams.get('condition');
  const setSelectedCondition = useCallback((condition: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (condition) {
      params.set('condition', condition);
    } else {
      params.delete('condition');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Redirect to onboarding if no organisation
  useEffect(() => {
    if (!isLoadingOrg && !organisation) {
      router.push('/');
    }
  }, [isLoadingOrg, organisation, router]);

  // Get latest time periods for both standard and outcome indicators
  const { data: latestStandardPeriod, isError: isPeriodError } = useLatestTimePeriod('standard');
  const { data: latestOutcomePeriod } = useLatestTimePeriod('outcome');

  // Fetch standard indicators
  const { data: standardIndicators, isLoading: isLoadingStandard, isError: isStdError } = useAreaIndicators(
    latestStandardPeriod?.TimePeriodID,
    organisation?.AreaID
  );

  // Fetch outcome indicators (different time period)
  const { data: outcomeIndicators, isLoading: isLoadingOutcome, isError: isOutError } = useAreaIndicators(
    latestOutcomePeriod?.TimePeriodID,
    organisation?.AreaID
  );

  const isDataError = isPeriodError || isStdError || isOutError;

  // Merge both sets - they contain different indicators
  const areaIndicators = useMemo(() => {
    if (!standardIndicators && !outcomeIndicators) return undefined;
    return [...(standardIndicators ?? []), ...(outcomeIndicators ?? [])];
  }, [standardIndicators, outcomeIndicators]);
  const isLoadingData = isLoadingStandard || isLoadingOutcome;
  const dashboardSections = useMemo(() => getDashboardSections(areaIndicators ?? []), [areaIndicators]);

  // Fetch baseline data for comparison (if not viewing same org as baseline)
  const shouldFetchBaseline = !isEngland && organisation?.AreaID !== baseline.AreaID;
  const { data: baselineStandardIndicators, isLoading: isLoadingBaselineStd } = useAreaIndicators(
    latestStandardPeriod?.TimePeriodID,
    shouldFetchBaseline ? baseline.AreaID : undefined
  );
  const { data: baselineOutcomeIndicators, isLoading: isLoadingBaselineOut } = useAreaIndicators(
    latestOutcomePeriod?.TimePeriodID,
    shouldFetchBaseline ? baseline.AreaID : undefined
  );
  const isLoadingBaseline = shouldFetchBaseline && (isLoadingBaselineStd || isLoadingBaselineOut);
  const baselineIndicators = useMemo(() => {
    if (!baselineStandardIndicators && !baselineOutcomeIndicators) return undefined;
    return [...(baselineStandardIndicators ?? []), ...(baselineOutcomeIndicators ?? [])];
  }, [baselineStandardIndicators, baselineOutcomeIndicators]);

  // Build data maps for the grid (All Indicators tab)
  const { quickStats, indicators, conditions } = useMemo(() => {
    const dataMap = new Map();
    const prevMap = new Map();
    const baselineMap = new Map();
    const conditionSet = new Set<string>();
    const indicatorList: {
      IndicatorID: number;
      IndicatorCode: string;
      IndicatorName: string;
      IndicatorShortName: string;
      IndicatorOrder: number;
      FormatDisplayName: string;
      IndicatorFormatID: number;
      AxisCharacter: string;
      DataUpdateInterval: string | null;
      IndicatorStatus: string | null;
      HighestPriorityNotificationType: string | null;
      NotificationCount: number;
      condition: string;
    }[] = [];

    let favourable = 0, at = 0, unfavourable = 0;
    let improving = 0, stable = 0, declining = 0;

    areaIndicators?.forEach((indicator) => {
      const condition = extractCondition(indicator.IndicatorShortName);
      conditionSet.add(condition);

      indicatorList.push({
        IndicatorID: indicator.IndicatorID,
        IndicatorCode: indicator.IndicatorCode,
        IndicatorName: indicator.IndicatorName,
        IndicatorShortName: indicator.IndicatorShortName,
        IndicatorOrder: indicator.IndicatorOrder,
        FormatDisplayName: indicator.FormatDisplayName,
        IndicatorFormatID: indicator.IndicatorFormatID,
        AxisCharacter: indicator.AxisCharacter,
        DataUpdateInterval: null,
        IndicatorStatus: null,
        HighestPriorityNotificationType: null,
        NotificationCount: 0,
        condition,
      });

      const personsCategory = getPersonsData(indicator);
      if (!personsCategory) return;

      const currentData = convertToRawDataFormat(personsCategory, indicator);
      dataMap.set(indicator.IndicatorID, currentData);
      const orgValue = currentData.Value;

      const timeSeries = personsCategory.TimeSeries;
      if (timeSeries && timeSeries.length >= 2) {
        const prevPoint = timeSeries[timeSeries.length - 2];
        if (prevPoint) {
          prevMap.set(indicator.IndicatorID, {
            ...currentData,
            Value: prevPoint.Value,
            TimePeriodID: prevPoint.TimePeriodID,
          });
        }
      }

      // Count trends for England mode
      if (isEngland && orgValue !== null) {
        const prevData = prevMap.get(indicator.IndicatorID);
        if (prevData?.Value !== null && prevData?.Value !== undefined) {
          const change = orgValue - prevData.Value;
          const direction = getTrendDirection(
            change,
            timeSeries.map(point => point.Value),
          );
          if (direction === 'flat') stable++;
          else {
            const lowerIsBetter = isLowerBetterIndicator(indicator.IndicatorCode, indicator);
            const isImproving = lowerIsBetter ? direction === 'down' : direction === 'up';
            if (isImproving) improving++;
            else declining++;
          }
        }
      }

      let baselineValue: number | null = null;
      if (!isEngland && baselineIndicators) {
        const baselineIndicator = baselineIndicators.find((b) => b.IndicatorID === indicator.IndicatorID);
        if (baselineIndicator) {
          const baselinePersons = getPersonsData(baselineIndicator);
          if (baselinePersons) {
            baselineMap.set(indicator.IndicatorID, convertToRawDataFormat(baselinePersons, baselineIndicator));
            baselineValue = baselinePersons.Data.Value;
          }
        }
      }

      if (orgValue !== null && baselineValue !== null && !isEngland) {
        const diff = orgValue - baselineValue;
        const effectiveDiff = isLowerBetterIndicator(indicator.IndicatorCode, indicator) ? -diff : diff;
        const isSignificant = Math.abs(diff) > COMPARISON_TOLERANCE;
        if (isSignificant && effectiveDiff > 0) favourable++;
        else if (isSignificant && effectiveDiff < 0) unfavourable++;
        else at++;
      }
    });

    indicatorList.sort((a, b) => a.IndicatorOrder - b.IndicatorOrder);
    const sortedConditions = [...conditionSet].sort();

    return {
      dataByIndicator: dataMap,
      previousDataByIndicator: prevMap,
      baselineDataByIndicator: baselineMap,
      quickStats: { favourable, at, unfavourable, improving, stable, declining },
      indicators: indicatorList,
      conditions: sortedConditions,
    };
  }, [areaIndicators, baselineIndicators, isEngland]);

  // Filter indicators by selected condition
  const filteredIndicators = useMemo(() => {
    if (!selectedCondition) return indicators;
    return indicators.filter((ind) => ind.condition === selectedCondition);
  }, [indicators, selectedCondition]);

  const filteredAreaIndicators = useMemo(() => {
    if (!areaIndicators) return undefined;
    const visibleIds = new Set(filteredIndicators.map((indicator) => indicator.IndicatorID));
    return areaIndicators.filter((indicator) => visibleIds.has(indicator.IndicatorID));
  }, [areaIndicators, filteredIndicators]);

  // Don't render if redirecting
  if (!organisation && !isLoadingOrg) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-nhs-pale-grey/30 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* Page header: organisation, comparison controls, summary strip */}
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <OrganisationHeader />
              {isEngland || currentTab === 'indicators' ? (
                <AreaChangeDialog className="hidden sm:inline-flex" />
              ) : (
                <BaselineSelector />
              )}
            </div>
            {currentTab !== 'indicators' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <QuickStats
                  favourableCount={quickStats.favourable}
                  atCount={quickStats.at}
                  unfavourableCount={quickStats.unfavourable}
                  baselineName={baselineName}
                  isEngland={isEngland}
                  improvingCount={quickStats.improving}
                  stableCount={quickStats.stable}
                  decliningCount={quickStats.declining}
                  isLoading={isLoadingOrg || isLoadingData || isLoadingBaseline}
                />
              </div>
            )}
          </div>

          {isDataError && <ApiUnavailable />}

          {/* Tabbed Interface */}
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList variant="line" className="w-full justify-start border-b border-gray-200">
              {!isEngland && <TabsTrigger value="overview" className="flex-none px-3">Overview</TabsTrigger>}
              <TabsTrigger value="trends" className="flex-none px-3">Trends</TabsTrigger>
              {!isEngland && <TabsTrigger value="pathways" className="flex-none px-3">Pathways</TabsTrigger>}
              <TabsTrigger value="indicators" className="flex-none px-3">{isEngland ? 'Indicators' : 'Improvement'}</TabsTrigger>
            </TabsList>

            {/* Overview Tab - Sections (non-England only) */}
            {!isEngland && (
              <TabsContent value="overview" className="mt-4 space-y-4">
                {isLoadingData ? (
                  <OverviewSkeleton />
                ) : areaIndicators && (
                  <>
                    <PrioritiesCard
                      indicators={areaIndicators}
                      baselineIndicators={baselineIndicators ?? []}
                      baselineName={baselineName}
                      isLoadingBaseline={isLoadingBaseline}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-base font-semibold text-gray-900">
                        By pathway stage
                        <span className="ml-2 text-sm font-normal text-gray-500">largest gaps first</span>
                      </h2>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="below-only"
                          checked={showBelowOnly}
                          onCheckedChange={setShowBelowOnly}
                        />
                        <Label htmlFor="below-only" className="cursor-pointer text-sm text-gray-600">
                          Behind {baselineName} only
                        </Label>
                      </div>
                    </div>

                    <div className="grid items-stretch gap-4 lg:grid-cols-2">
                      {dashboardSections.map(section => (
                        <SectionView
                          key={section.id}
                          section={section}
                          indicators={areaIndicators}
                          baselineIndicators={baselineIndicators ?? []}
                          baselineName={baselineName}
                          showBelowOnly={showBelowOnly}
                          isLoadingBaseline={isLoadingBaseline}
                          isEngland={isEngland}
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            )}

            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-4">
              {isLoadingData ? (
                <TrendsSkeleton />
              ) : areaIndicators && (
                <TrendsView
                  indicators={areaIndicators}
                  isEngland={isEngland}
                />
              )}
            </TabsContent>

            {/* Pathways Tab (non-England only) */}
            {!isEngland && (
              <TabsContent value="pathways" className="mt-4">
                {isLoadingData ? (
                  <PathwaysSkeleton />
                ) : areaIndicators && (
                  <PathwayOverview
                    indicators={areaIndicators}
                    baselineIndicators={baselineIndicators ?? []}
                    baselineName={baselineName}
                  />
                )}
              </TabsContent>
            )}

            {/* Quality Improvement Tab */}
            <TabsContent value="indicators" className="mt-4">
              <ConditionFilter
                conditions={conditions}
                selectedCondition={selectedCondition}
                onSelectCondition={setSelectedCondition}
              />

              <QualityImprovementExplorer
                indicators={filteredAreaIndicators}
                areaName={organisation?.AreaName ?? 'Selected area'}
                systemLevelName={organisation?.SystemLevelName ? `${organisation.SystemLevelName}s` : undefined}
                isLoading={isLoadingOrg || isLoadingData}
                isEngland={isEngland}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
