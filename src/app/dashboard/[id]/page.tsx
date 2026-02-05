'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Leaflet requires browser APIs, so dynamic import with SSR disabled
const ChoroplethMap = dynamic(
  () => import('@/components/charts/choropleth-map').then((m) => m.ChoroplethMap),
  { ssr: false, loading: () => <div className="flex h-[400px] items-center justify-center text-gray-400">Loading map...</div> }
);
import {
  IndicatorNav,
  HeroSection,
  TrendSection,
  PeerSection,
  DemographicsGrid,
} from '@/components/indicator-detail';
import { BaselineSelector } from '@/components/dashboard';
import { useOrganisation } from '@/providers/organisation-context';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAreaIndicators, getPersonsData, useSiblingData, useChildAreas, useChildData } from '@/lib/hooks/use-area-indicators';
import { useIndicatorData } from '@/lib/hooks/use-indicator-data';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { isOutcomeIndicator } from '@/lib/api';
import { SYSTEM_LEVELS, type Area, type IndicatorRawData, type IndicatorWithData } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { formatTimePeriod, formatValue } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';

// Convert new data format to IndicatorRawData for components
function convertCategoryToRawData(
  indicator: IndicatorWithData,
  category: IndicatorWithData['Categories'][0],
  areaCode: string = ''
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

export default function IndicatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const indicatorId = parseInt(params.id as string, 10);

  const { organisation, levelId, isEngland, isLoading: isLoadingOrg, baseline } = useOrganisation();

  // Get clean baseline name for display
  const baselineName = useMemo(() => {
    if (baseline.SystemLevelID === 1) return 'England';
    return baseline.AreaName
      .replace(/^NHS /, '')
      .replace(/ Integrated Care Board$/, '')
      .replace(/ Primary Care Network$/, '');
  }, [baseline]);

  // Redirect if no organisation
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

  // Merge both sets
  const areaIndicators = useMemo(() => {
    if (!standardIndicators && !outcomeIndicators) return undefined;
    return [...(standardIndicators ?? []), ...(outcomeIndicators ?? [])];
  }, [standardIndicators, outcomeIndicators]);
  const isLoadingArea = isLoadingStandard || isLoadingOutcome;

  // Fetch baseline data for comparison
  const shouldFetchBaseline = !isEngland && organisation?.AreaID !== baseline.AreaID;
  const { data: baselineStandardIndicators, isLoading: isLoadingBaselineStd } = useAreaIndicators(
    latestStandardPeriod?.TimePeriodID,
    shouldFetchBaseline ? baseline.AreaID : undefined
  );
  const { data: baselineOutcomeIndicators, isLoading: isLoadingBaselineOut } = useAreaIndicators(
    latestOutcomePeriod?.TimePeriodID,
    shouldFetchBaseline ? baseline.AreaID : undefined
  );
  const baselineIndicators = useMemo(() => {
    if (!baselineStandardIndicators && !baselineOutcomeIndicators) return undefined;
    return [...(baselineStandardIndicators ?? []), ...(baselineOutcomeIndicators ?? [])];
  }, [baselineStandardIndicators, baselineOutcomeIndicators]);
  const isLoadingBaseline = isLoadingBaselineStd || isLoadingBaselineOut;

  // Determine which time period this indicator uses
  const latestPeriod = useMemo(() => {
    const ind = areaIndicators?.find((i) => i.IndicatorID === indicatorId);
    if (!ind) return latestStandardPeriod; // default to standard while loading
    return ind.IndicatorTypeName === 'Outcome' ? latestOutcomePeriod : latestStandardPeriod;
  }, [areaIndicators, indicatorId, latestStandardPeriod, latestOutcomePeriod]);

  // Always fetch England data for reference lines (cached by React Query)
  const { data: englandIndicators } = useAreaIndicators(
    latestPeriod?.TimePeriodID,
    !isEngland ? 1 : undefined
  );

  // Get all areas for parent name lookup and to find organisation with correct Parents
  const { areasByLevel } = useAllAreas(latestPeriod?.TimePeriodID);

  // Find the current indicator from cached data
  const indicator = useMemo(() => {
    return areaIndicators?.find((ind) => ind.IndicatorID === indicatorId);
  }, [areaIndicators, indicatorId]);

  const baselineIndicator = useMemo(() => {
    return baselineIndicators?.find((ind) => ind.IndicatorID === indicatorId);
  }, [baselineIndicators, indicatorId]);


  // Get the metricID for Persons (needed for siblingData)
  const personsMetricId = useMemo(() => {
    const persons = indicator ? getPersonsData(indicator) : undefined;
    return persons?.MetricID;
  }, [indicator]);

  // Fetch peer/sibling data for comparison (only if not England)
  const { data: siblingData, isLoading: isLoadingSiblings } = useSiblingData(
    latestPeriod?.TimePeriodID,
    organisation?.AreaID,
    isEngland ? undefined : personsMetricId
  );

  // Fetch child areas (e.g., PCNs within a Sub-ICB)
  const { data: childAreas } = useChildAreas(
    isEngland ? undefined : organisation?.AreaID,
    latestPeriod?.TimePeriodID
  );

  // Fetch child data using the dedicated childData endpoint
  const { data: childData, isLoading: isLoadingChildren } = useChildData(
    latestPeriod?.TimePeriodID,
    isEngland ? undefined : organisation?.AreaID,
    personsMetricId
  );

  // Build indicator list for nav (from cached data)
  const indicators = useMemo(() => {
    return areaIndicators?.map((ind) => ({
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
    })).sort((a, b) => a.IndicatorOrder - b.IndicatorOrder);
  }, [areaIndicators]);

  // Build nav data map
  const navDataByIndicator = useMemo(() => {
    const map = new Map<number, IndicatorRawData>();
    areaIndicators?.forEach((ind) => {
      const persons = getPersonsData(ind);
      if (persons) {
        map.set(ind.IndicatorID, convertCategoryToRawData(ind, persons, organisation?.AreaCode));
      }
    });
    return map;
  }, [areaIndicators, organisation]);

  // Extract data for the current indicator
  const { areaData, baselineData, previousData, areaTrendData, baselineTrendData, areaAllData, baselineAllData } = useMemo(() => {
    if (!indicator) {
      return {
        areaData: undefined,
        baselineData: undefined,
        previousData: undefined,
        areaTrendData: [],
        baselineTrendData: [],
        areaAllData: [],
        baselineAllData: [],
      };
    }

    const persons = getPersonsData(indicator);
    const areaData = persons ? convertCategoryToRawData(indicator, persons, organisation?.AreaCode) : undefined;

    // Previous data from time series
    let previousData: IndicatorRawData | undefined;
    if (persons?.TimeSeries && persons.TimeSeries.length >= 2) {
      const prevPoint = persons.TimeSeries[persons.TimeSeries.length - 2];
      if (prevPoint && areaData) {
        previousData = { ...areaData, Value: prevPoint.Value, TimePeriodID: prevPoint.TimePeriodID };
      }
    }

    // Trend data from time series - sort by EndDate for chronological order
    const areaTrendData = persons?.TimeSeries
      ?.slice()
      .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime())
      .map((point) => ({
        period: formatTimePeriod(point.TimePeriodName),
        value: point.Value,
      })) ?? [];

    // Baseline data
    const baselinePersons = baselineIndicator ? getPersonsData(baselineIndicator) : undefined;
    const baselineData = baselinePersons ? convertCategoryToRawData(baselineIndicator!, baselinePersons, baseline.AreaCode) : undefined;
    const baselineTrendData = baselinePersons?.TimeSeries
      ?.slice()
      .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime())
      .map((point) => ({
        period: formatTimePeriod(point.TimePeriodName),
        value: point.Value,
      })) ?? [];

    // All demographic data for the area
    const areaAllData = indicator.Categories.map((cat) => convertCategoryToRawData(indicator, cat, organisation?.AreaCode));
    const baselineAllData = baselineIndicator?.Categories.map((cat) => convertCategoryToRawData(baselineIndicator, cat, baseline.AreaCode)) ?? [];

    return { areaData, baselineData, previousData, areaTrendData, baselineTrendData, areaAllData, baselineAllData };
  }, [indicator, baselineIndicator, organisation, baseline]);

  // Convert sibling data to peer format for PeerSection
  const { peers, peerData } = useMemo(() => {
    if (!siblingData?.Data) return { peers: [], peerData: [] };

    const peers = siblingData.Data.map((item) => ({
      AreaCode: item.AreaCode,
      AreaID: item.AreaID,
      AreaName: item.AreaName,
      Parents: [],
      SystemLevelID: item.SystemLevelID,
      SystemLevelName: item.SystemLevelName,
    }));

    const peerData: IndicatorRawData[] = siblingData.Data.map((item) => ({
      IndicatorID: siblingData.IndicatorID,
      AreaCode: item.AreaCode,
      AreaName: item.AreaName,
      TimePeriodID: item.TimePeriodID,
      TimePeriodName: item.TimePeriodName,
      MetricCategoryTypeName: siblingData.MetricCategoryTypeName,
      MetricCategoryName: siblingData.MetricCategoryName,
      Numerator: item.Numerator,
      Denominator: item.Denominator,
      Value: item.Value,
      LowerCI: item.LowerConfidenceLimit,
      UpperCI: item.UpperConfidenceLimit,
      ComparedToEnglandValue: null,
      ComparedToEnglandID: null,
    }));

    return { peers, peerData };
  }, [siblingData]);

  // Convert child data to the same format
  // Use childAreas (from /area/{id}/details) for area info with correct SystemLevelID
  // Match with childData for actual values
  const { children, childrenData } = useMemo(() => {
    // Use childAreas as the source of truth for child areas
    if (!childAreas || childAreas.length === 0) return { children: [], childrenData: [] };

    const children = childAreas.map((area) => ({
      AreaCode: area.AreaCode,
      AreaID: area.AreaID,
      AreaName: area.AreaName,
      Parents: [],
      SystemLevelID: area.SystemLevelID,
      SystemLevelName: '',
    }));

    // Match childData values with childAreas
    const childrenData: IndicatorRawData[] = [];
    if (childData?.Data) {
      for (const area of childAreas) {
        const dataItem = childData.Data.find((d) => d.AreaCode === area.AreaCode);
        if (dataItem) {
          childrenData.push({
            IndicatorID: childData.IndicatorID,
            AreaCode: area.AreaCode,
            AreaName: area.AreaName,
            TimePeriodID: dataItem.TimePeriodID,
            TimePeriodName: dataItem.TimePeriodName,
            MetricCategoryTypeName: childData.MetricCategoryTypeName,
            MetricCategoryName: childData.MetricCategoryName,
            Numerator: dataItem.Numerator,
            Denominator: dataItem.Denominator,
            Value: dataItem.Value,
            LowerCI: dataItem.LowerConfidenceLimit,
            UpperCI: dataItem.UpperConfidenceLimit,
            ComparedToEnglandValue: null,
            ComparedToEnglandID: null,
          });
        }
      }
    }

    return { children, childrenData };
  }, [childAreas, childData]);

  // Fetch national comparison data for ICB/Sub-ICB (not PCN - too many areas)
  // Also fetch ICB data when viewing England (for map)
  const nationalLevelId = isEngland ? SYSTEM_LEVELS.ICB : (levelId !== SYSTEM_LEVELS.PCN ? levelId : null);
  const { data: nationalRawData, isLoading: isLoadingNational } = useIndicatorData(
    indicatorId,
    latestPeriod?.TimePeriodID,
    nationalLevelId ?? undefined
  );

  // Convert national raw data to peer format
  const { nationalAreas, nationalData } = useMemo(() => {
    if (!nationalRawData) return { nationalAreas: [] as Area[], nationalData: [] as IndicatorRawData[] };

    const personsData = nationalRawData.filter(
      (d) => d.MetricCategoryTypeName === 'Sex' && d.MetricCategoryName === 'Persons'
    );

    const nationalAreas = personsData.map((d) => ({
      AreaCode: d.AreaCode,
      AreaID: 0,
      AreaName: d.AreaName,
      Parents: [],
      SystemLevelID: nationalLevelId ?? SYSTEM_LEVELS.ICB,
      SystemLevelName: '',
    }));

    return { nationalAreas, nationalData: personsData };
  }, [nationalRawData, levelId]);

  // Find organisation in areasByLevel (has correct Parents array from API)
  const orgFromAreas = useMemo(() => {
    if (!organisation) return null;
    for (const [, areaList] of areasByLevel) {
      const found = areaList.find((a) => a.AreaID === organisation.AreaID);
      if (found) return found;
    }
    return null;
  }, [organisation, areasByLevel]);

  // Get parent AreaID from the found org (more reliable) or fallback to context org
  const effectiveParentId = orgFromAreas?.Parents?.[0] ?? organisation?.Parents?.[0];

  // Fetch parent area data for benchmark comparison (e.g., ICB for PCN)
  const { data: parentIndicators2 } = useAreaIndicators(
    latestPeriod?.TimePeriodID,
    effectiveParentId
  );

  // Find parent indicator from fetched data
  const parentIndicator = useMemo(() => {
    return parentIndicators2?.find((ind) => ind.IndicatorID === indicatorId);
  }, [parentIndicators2, indicatorId]);

  // Get parent info for peer section
  const { parentName, parentValue } = useMemo(() => {
    let parentName: string | undefined;
    let parentValue: number | null = null;

    const parentId = effectiveParentId;
    if (!parentId) {
      return { parentName, parentValue };
    }

    // Get parent name from areas
    for (const [, areaList] of areasByLevel) {
      const parent = areaList.find((a) => a.AreaID === parentId);
      if (parent) {
        parentName = parent.AreaName
          .replace(/^NHS /, '')
          .replace(/ Integrated Care Board$/, '')
          .replace(/ Primary Care Network$/, '');
        break;
      }
    }

    // Get parent value from parent indicators
    if (parentIndicator) {
      const parentPersons = getPersonsData(parentIndicator);
      parentValue = parentPersons?.Data.Value ?? null;
    }

    return { parentName, parentValue };
  }, [effectiveParentId, areasByLevel, parentIndicator]);

  // England value for reference line (always available unless we ARE England)
  const englandValue = useMemo(() => {
    if (isEngland) return areaData?.Value ?? null;
    const englandInd = englandIndicators?.find(i => i.IndicatorID === indicatorId);
    if (!englandInd) return null;
    const persons = getPersonsData(englandInd);
    return persons?.Data.Value ?? null;
  }, [isEngland, areaData, englandIndicators, indicatorId]);

  // Region value: for ICBs the parent IS the region
  // For Sub-ICBs, find the region from the parent chain
  const { regionName, regionValue } = useMemo(() => {
    if (!orgFromAreas || isEngland) return { regionName: undefined, regionValue: null };

    // Find region in parent chain
    const regionLevel = areasByLevel.get(SYSTEM_LEVELS.REGION);
    if (!regionLevel) return { regionName: undefined, regionValue: null };

    // Check if any parent is a region
    const regionArea = regionLevel.find(r => orgFromAreas.Parents?.includes(r.AreaID));
    if (!regionArea) return { regionName: undefined, regionValue: null };

    const regionName = regionArea.AreaName;

    // Get region value: if parent IS the region, use parentValue
    // Otherwise need to look it up from englandIndicators is wrong...
    // Actually, if parent is region, parentValue is already region value
    if (effectiveParentId === regionArea.AreaID) {
      return { regionName, regionValue: parentValue };
    }

    // For Sub-ICB: parent is ICB, region is grandparent
    // We'd need a separate fetch, but for now check if baseline is the region
    if (baseline.AreaID === regionArea.AreaID && baselineData) {
      return { regionName, regionValue: baselineData.Value };
    }

    return { regionName, regionValue: null as number | null };
  }, [orgFromAreas, isEngland, areasByLevel, effectiveParentId, parentValue, baseline, baselineData]);

  // Compute rank among peers (higher value = rank 1)
  const rank = useMemo(() => {
    if (!peerData.length || !organisation) return null;
    const sorted = peerData
      .filter((d) => d.Value !== null)
      .sort((a, b) => (b.Value ?? 0) - (a.Value ?? 0));
    const position = sorted.findIndex((d) => d.AreaCode === organisation.AreaCode) + 1;
    if (position === 0) return null;
    const effectiveLevel = levelId ?? SYSTEM_LEVELS.ICB;
    return { position, total: sorted.length, levelName: SYSTEM_LEVEL_NAMES[effectiveLevel] ?? 'peer' };
  }, [peerData, organisation, levelId]);

  // Time period label
  const timePeriodLabel = latestPeriod?.TimePeriodName ?? '';

  const effectiveLevelId = isEngland ? SYSTEM_LEVELS.ENGLAND : levelId;

  const areaName = organisation?.AreaName
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '') ?? '';

  // Don't render if redirecting
  if (!organisation && !isLoadingOrg) return null;

  if (!indicator || isLoadingArea) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-[#E8EDEE]/30 p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-[400px]" />
          </div>
        </main>
      </div>
    );
  }

  // Convert indicator to the format expected by components
  const indicatorForComponents = {
    ...indicator,
    DataUpdateInterval: null,
    IndicatorStatus: null,
    HighestPriorityNotificationType: null,
    NotificationCount: 0,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-[#E8EDEE]/30 p-6">
        <div className="mx-auto max-w-6xl">
          {/* Back link */}
          <Link href={buildUrl('/dashboard', searchParams)}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Organisation & Indicator Header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{isEngland ? 'National' : organisation?.SystemLevelName}</p>
              <h1 className="text-xl font-bold text-[#003087]">{areaName}</h1>
            </div>
            {!isEngland && <BaselineSelector />}
          </div>

          {/* Indicator Nav */}
          {indicators && (
            <IndicatorNav
              indicators={indicators}
              currentId={indicatorId}
              dataByIndicator={navDataByIndicator}
            />
          )}

          {/* Indicator Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-[#003087]">{indicator.IndicatorShortName}</h2>
              <Badge variant={indicator.IndicatorTypeName === 'Outcome' ? 'secondary' : 'default'}>
                {indicator.IndicatorTypeName}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{indicator.IndicatorName}</p>
          </div>

          {/* All sections visible at once */}
          <div className="space-y-6">
            {/* Hero Section */}
            <HeroSection
              indicator={indicatorForComponents}
              areaData={areaData}
              baselineData={baselineData}
              baselineName={baselineName}
              previousData={previousData}
              areaName={areaName}
              isEngland={isEngland}
              rank={rank}
              timePeriodLabel={timePeriodLabel}
            />

            {/* Trend Section - data is already loaded from the main query! */}
            <TrendSection
              indicator={indicatorForComponents}
              areaTrendData={areaTrendData}
              baselineTrendData={baselineTrendData}
              baselineName={baselineName}
              areaName={areaName}
              isLoading={false}
              isEngland={isEngland}
            />

            {/* Peer/Children Section (not shown for England) */}
            {!isEngland && (
              <PeerSection
                indicator={indicatorForComponents}
                peerData={peerData}
                peers={peers}
                childrenData={childrenData}
                children={children}
                nationalData={nationalData}
                nationalAreas={nationalAreas}
                selectedAreaCode={organisation?.AreaCode ?? ''}
                baselineValue={baselineData?.Value ?? null}
                baselineName={baselineName}
                areaValue={areaData?.Value ?? null}
                parentName={parentName}
                parentValue={parentValue}
                englandValue={englandValue}
                regionValue={regionValue}
                regionName={regionName}
                levelId={effectiveLevelId ?? SYSTEM_LEVELS.ICB}
                isLoadingPeers={isLoadingSiblings}
                isLoadingChildren={isLoadingChildren}
                isLoadingNational={isLoadingNational}
              />
            )}

            {/* Map Section - show for levels with boundary data */}
            {nationalData.length > 0 && (nationalLevelId === SYSTEM_LEVELS.REGION ||
              nationalLevelId === SYSTEM_LEVELS.ICB ||
              nationalLevelId === SYSTEM_LEVELS.SUB_ICB) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">National Map</CardTitle>
                  <CardDescription>
                    {indicator.IndicatorShortName} by {SYSTEM_LEVEL_NAMES[nationalLevelId ?? SYSTEM_LEVELS.ICB]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChoroplethMap
                    data={nationalData.map((d) => ({
                      code: d.AreaCode,
                      name: d.AreaName,
                      value: d.Value,
                    }))}
                    levelId={nationalLevelId ?? SYSTEM_LEVELS.ICB}
                    selectedAreaCode={organisation?.AreaCode}
                    baselineValue={baselineData?.Value ?? null}
                    baselineName={baselineName}
                    formatValue={(v: number) => formatValue(v, indicator.FormatDisplayName)}
                    height={450}
                  />
                </CardContent>
              </Card>
            )}

            {/* Demographics Grid */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#003087]">Demographic Breakdowns</h2>
              <DemographicsGrid
                indicator={indicatorForComponents}
                areaData={areaAllData}
                baselineData={baselineAllData}
                baselineName={baselineName}
                areaName={areaName}
                isEngland={isEngland}
                isLoading={isLoadingArea || isLoadingBaseline}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
