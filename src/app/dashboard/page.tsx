'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import {
  OrganisationHeader,
  QuickStats,
  IndicatorSummaryGrid,
  ConditionFilter,
  BaselineSelector,
  SectionView,
  PrioritiesCard,
  TrendsView,
} from '@/components/dashboard';
import { OverviewSkeleton, TrendsSkeleton, PathwaysSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { Footer } from '@/components/layout/footer';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PathwayOverview } from '@/components/pathways';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAreaIndicators, getPersonsData } from '@/lib/hooks/use-area-indicators';
import { extractCondition } from '@/lib/utils/format';
import { DASHBOARD_SECTIONS } from '@/lib/constants/indicator-sections';
import type { IndicatorCategoryData, IndicatorWithData } from '@/lib/api/types';

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
  const { data: latestStandardPeriod } = useLatestTimePeriod('standard');
  const { data: latestOutcomePeriod } = useLatestTimePeriod('outcome');

  // Fetch standard indicators
  const { data: standardIndicators, isLoading: isLoadingStandard } = useAreaIndicators(
    latestStandardPeriod?.TimePeriodID,
    organisation?.AreaID
  );

  // Fetch outcome indicators (different time period)
  const { data: outcomeIndicators, isLoading: isLoadingOutcome } = useAreaIndicators(
    latestOutcomePeriod?.TimePeriodID,
    organisation?.AreaID
  );

  // Merge both sets - they contain different indicators
  const areaIndicators = useMemo(() => {
    if (!standardIndicators && !outcomeIndicators) return undefined;
    return [...(standardIndicators ?? []), ...(outcomeIndicators ?? [])];
  }, [standardIndicators, outcomeIndicators]);
  const isLoadingData = isLoadingStandard || isLoadingOutcome;

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
  const { dataByIndicator, previousDataByIndicator, baselineDataByIndicator, quickStats, indicators, conditions } = useMemo(() => {
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

    let above = 0, at = 0, below = 0;
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
          if (Math.abs(change) < 0.1) stable++;
          else if (change > 0) improving++;
          else declining++;
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
        const relativeDiff = baselineValue !== 0 ? (Math.abs(diff) / baselineValue) * 100 : 0;
        const isSignificant = relativeDiff > 0.25;
        if (isSignificant && diff > 0) above++;
        else if (isSignificant && diff < 0) below++;
        else at++;
      }
    });

    indicatorList.sort((a, b) => a.IndicatorOrder - b.IndicatorOrder);
    const sortedConditions = [...conditionSet].sort();

    return {
      dataByIndicator: dataMap,
      previousDataByIndicator: prevMap,
      baselineDataByIndicator: baselineMap,
      quickStats: { above, at, below, improving, stable, declining },
      indicators: indicatorList,
      conditions: sortedConditions,
    };
  }, [areaIndicators, baselineIndicators, isEngland]);

  // Filter indicators by selected condition
  const filteredIndicators = useMemo(() => {
    if (!selectedCondition) return indicators;
    return indicators.filter((ind) => ind.condition === selectedCondition);
  }, [indicators, selectedCondition]);

  // Don't render if redirecting
  if (!organisation && !isLoadingOrg) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-nhs-pale-grey/30 p-6">
        <div className="mx-auto max-w-7xl">
          <OrganisationHeader />

          {!isEngland && (
            <div className="mb-4 flex items-center justify-between">
              <BaselineSelector />
            </div>
          )}

          <QuickStats
            aboveCount={quickStats.above}
            atCount={quickStats.at}
            belowCount={quickStats.below}
            baselineName={baselineName}
            isEngland={isEngland}
            improvingCount={quickStats.improving}
            stableCount={quickStats.stable}
            decliningCount={quickStats.declining}
            isLoading={isLoadingData}
          />

          {/* Tabbed Interface */}
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-6">
            <TabsList className={cn(
              'grid w-full max-w-md',
              isEngland ? 'grid-cols-2' : 'grid-cols-4',
            )}>
              {!isEngland && <TabsTrigger value="overview">Overview</TabsTrigger>}
              <TabsTrigger value="trends">Trends</TabsTrigger>
              {!isEngland && <TabsTrigger value="pathways">Pathways</TabsTrigger>}
              <TabsTrigger value="indicators">All Indicators</TabsTrigger>
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

                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        id="below-only"
                        checked={showBelowOnly}
                        onCheckedChange={setShowBelowOnly}
                      />
                      <Label htmlFor="below-only" className="text-sm text-gray-600 cursor-pointer">
                        Show below {baselineName} only
                      </Label>
                    </div>

                    {DASHBOARD_SECTIONS.map(section => (
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
                    areaName={organisation?.AreaName ?? ''}
                  />
                )}
              </TabsContent>
            )}

            {/* All Indicators Tab */}
            <TabsContent value="indicators" className="mt-4">
              <ConditionFilter
                conditions={conditions}
                selectedCondition={selectedCondition}
                onSelectCondition={setSelectedCondition}
              />

              <IndicatorSummaryGrid
                indicators={filteredIndicators}
                dataByIndicator={dataByIndicator}
                previousDataByIndicator={previousDataByIndicator}
                baselineDataByIndicator={baselineDataByIndicator}
                baselineName={baselineName}
                loadingIndicators={new Set()}
                isLoadingIndicators={isLoadingOrg || isLoadingData}
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
