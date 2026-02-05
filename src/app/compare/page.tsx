'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ComparisonChart } from '@/components/charts/comparison-chart';
import { ChartTableToggle, type TableColumn } from '@/components/charts';
import { AreaPicker } from '@/components/geography/area-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTimePeriods, useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useIndicators, useIndicatorData } from '@/lib/hooks/use-indicator-data';
import { useAreas, useAllAreas } from '@/lib/hooks/use-areas';
import { filterByCategory, getPeerAreas } from '@/lib/api';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES, getParentLevel } from '@/lib/constants/geography';
import { formatValue } from '@/lib/utils/format';

export default function ComparePage() {
  const { data: timePeriods } = useTimePeriods();
  const { data: latestPeriod } = useLatestTimePeriod('standard');

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>();
  const [selectedLevelId, setSelectedLevelId] = useState<number>(SYSTEM_LEVELS.ICB);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | undefined>();

  useEffect(() => {
    if (latestPeriod && !selectedPeriodId) {
      setSelectedPeriodId(latestPeriod.TimePeriodID);
    }
  }, [latestPeriod, selectedPeriodId]);

  const { data: areas, isLoading: isLoadingAreas } = useAreas(selectedPeriodId, selectedLevelId);
  const { areasByLevel } = useAllAreas(selectedPeriodId);
  const { data: indicators, isLoading: isLoadingIndicators } = useIndicators(selectedPeriodId, selectedLevelId);

  // Set initial indicator when loaded
  useEffect(() => {
    if (indicators && indicators.length > 0 && !selectedIndicatorId) {
      setSelectedIndicatorId(indicators[0].IndicatorID);
    }
  }, [indicators, selectedIndicatorId]);

  // Reset indicator when level changes
  useEffect(() => {
    setSelectedIndicatorId(undefined);
  }, [selectedLevelId]);

  const indicator = indicators?.find((i) => i.IndicatorID === selectedIndicatorId);

  // Get data at selected level
  const { data: levelData, isLoading: isLoadingLevel } = useIndicatorData(
    selectedIndicatorId,
    selectedPeriodId,
    selectedLevelId
  );

  // Get parent level data
  const parentLevelId = getParentLevel(selectedLevelId);
  const { data: parentData } = useIndicatorData(
    selectedIndicatorId,
    selectedPeriodId,
    parentLevelId ?? undefined
  );

  // Get England data
  const { data: englandData } = useIndicatorData(
    selectedIndicatorId,
    selectedPeriodId,
    SYSTEM_LEVELS.ENGLAND
  );

  // Find peers (same parent) - limit to avoid huge lists
  const peers = useMemo(() => {
    if (!selectedArea || !areas) return [];
    const allPeers = getPeerAreas(selectedArea.AreaCode, areas);
    // Show at most 30 peers
    return allPeers.slice(0, 30);
  }, [selectedArea, areas]);

  // Get parent area
  const parentArea = useMemo(() => {
    if (!selectedArea || selectedArea.Parents.length === 0) return null;
    const parentLevel = areasByLevel.get(parentLevelId ?? 0);
    return parentLevel?.find((a) => a.AreaID === selectedArea.Parents[0]) ?? null;
  }, [selectedArea, areasByLevel, parentLevelId]);

  const parentAreaName = parentArea?.AreaName.replace(/^NHS /, '').replace(/ Integrated Care Board$/, '') ?? '';

  // Build comparison chart data
  const comparisonData = useMemo(() => {
    if (!selectedArea) return [];

    const result: {
      name: string;
      value: number | null;
      lowerCI?: number | null;
      upperCI?: number | null;
      type: 'selected' | 'peer' | 'parent' | 'benchmark';
    }[] = [];

    // Get persons data from level data
    const personsData = levelData ? filterByCategory(levelData, 'Sex', 'Persons') : [];

    // Selected area
    const selectedData = personsData.find((d) => d.AreaCode === selectedArea.AreaCode);
    result.push({
      name: selectedArea.AreaName
        .replace(/^NHS /, '')
        .replace(/ Integrated Care Board$/, '')
        .replace(/ Primary Care Network$/, ''),
      value: selectedData?.Value ?? null,
      lowerCI: selectedData?.LowerCI,
      upperCI: selectedData?.UpperCI,
      type: 'selected',
    });

    // Peers (limit to top 10 for chart readability)
    const peerData = peers
      .filter((p) => p.AreaCode !== selectedArea.AreaCode)
      .map((peer) => {
        const data = personsData.find((d) => d.AreaCode === peer.AreaCode);
        return {
          peer,
          value: data?.Value ?? null,
          lowerCI: data?.LowerCI,
          upperCI: data?.UpperCI,
        };
      })
      .filter((p) => p.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 10);

    for (const { peer, value, lowerCI, upperCI } of peerData) {
      result.push({
        name: peer.AreaName
          .replace(/^NHS /, '')
          .replace(/ Integrated Care Board$/, '')
          .replace(/ Primary Care Network$/, ''),
        value,
        lowerCI,
        upperCI,
        type: 'peer',
      });
    }

    // Parent
    if (parentData && parentArea) {
      const parentPersons = filterByCategory(parentData, 'Sex', 'Persons');
      const parentAreaData = parentPersons.find((d) => d.AreaCode === parentArea.AreaCode);
      if (parentAreaData) {
        result.push({
          name: parentArea.AreaName
            .replace(/^NHS /, '')
            .replace(/ Integrated Care Board$/, ''),
          value: parentAreaData.Value,
          lowerCI: parentAreaData.LowerCI,
          upperCI: parentAreaData.UpperCI,
          type: 'parent',
        });
      }
    }

    // England
    if (englandData) {
      const englandPersons = filterByCategory(englandData, 'Sex', 'Persons');
      if (englandPersons[0]) {
        result.push({
          name: 'England',
          value: englandPersons[0].Value,
          lowerCI: englandPersons[0].LowerCI,
          upperCI: englandPersons[0].UpperCI,
          type: 'benchmark',
        });
      }
    }

    return result.filter((d) => d.value !== null);
  }, [selectedArea, levelData, peers, parentData, parentArea, englandData]);

  // Peer comparison table data
  const peerTableData = useMemo(() => {
    if (!levelData || !peers.length) return [];

    const personsData = filterByCategory(levelData, 'Sex', 'Persons');

    return peers
      .map((peer) => {
        const data = personsData.find((d) => d.AreaCode === peer.AreaCode);
        return {
          area: peer,
          value: data?.Value ?? null,
          lowerCI: data?.LowerCI ?? null,
          upperCI: data?.UpperCI ?? null,
          isSelected: peer.AreaCode === selectedArea?.AreaCode,
        };
      })
      .filter((d) => d.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [levelData, peers, selectedArea]);

  const formatFn = (v: number) => formatValue(v, indicator?.FormatDisplayName ?? '%');

  const isLoading = isLoadingAreas || isLoadingIndicators || isLoadingLevel;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-[#E8EDEE]/30 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#003087] mb-4">Compare Areas</h1>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Geographic Level
              </label>
              <Select
                value={selectedLevelId.toString()}
                onValueChange={(v) => {
                  setSelectedLevelId(parseInt(v, 10));
                  setSelectedArea(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[SYSTEM_LEVELS.REGION, SYSTEM_LEVELS.ICB, SYSTEM_LEVELS.SUB_ICB, SYSTEM_LEVELS.PCN].map(
                    (level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {SYSTEM_LEVEL_NAMES[level]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <AreaPicker
              areas={areas}
              selectedArea={selectedArea}
              onSelectArea={setSelectedArea}
              levelId={selectedLevelId}
              placeholder="Select area to compare"
              isLoading={isLoadingAreas}
            />

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Indicator</label>
              <Select
                value={selectedIndicatorId?.toString() ?? ''}
                onValueChange={(v) => setSelectedIndicatorId(parseInt(v, 10))}
                disabled={isLoadingIndicators || !indicators?.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingIndicators ? 'Loading...' : 'Select indicator'} />
                </SelectTrigger>
                <SelectContent>
                  {indicators?.map((ind) => (
                    <SelectItem key={ind.IndicatorID} value={ind.IndicatorID.toString()}>
                      {ind.IndicatorShortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Time Period
              </label>
              <Select
                value={selectedPeriodId?.toString()}
                onValueChange={(v) => setSelectedPeriodId(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timePeriods
                    ?.filter((p) => p.TimePeriodName.startsWith('To '))
                    .map((period) => (
                      <SelectItem key={period.TimePeriodID} value={period.TimePeriodID.toString()}>
                        {period.TimePeriodName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedArea && selectedIndicatorId ? (
          <Tabs defaultValue="chart" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chart">Comparison Chart</TabsTrigger>
              <TabsTrigger value="table">Peer Table</TabsTrigger>
            </TabsList>

            <TabsContent value="chart">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedArea.AreaName
                      .replace(/^NHS /, '')
                      .replace(/ Integrated Care Board$/, '')
                      .replace(/ Primary Care Network$/, '')} vs Peers & Parents
                  </CardTitle>
                  <CardDescription>
                    {indicator?.IndicatorShortName}
                    {parentAreaName && ` - comparing to peers within ${parentAreaName} and parent organisations up to England`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-[400px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : comparisonData.length === 0 ? (
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                      No data available for this selection
                    </div>
                  ) : (
                    <ChartTableToggle
                      chart={
                        <ComparisonChart
                          data={comparisonData}
                          yAxisLabel={indicator?.AxisCharacter}
                          formatValue={formatFn}
                          height={400}
                        />
                      }
                      tableData={comparisonData.map((d) => ({
                        name: d.name,
                        value: d.value,
                        ci: d.lowerCI != null && d.upperCI != null ? `${formatFn(d.lowerCI)} – ${formatFn(d.upperCI)}` : '—',
                        type: d.type,
                      }))}
                      columns={[
                        { key: 'name', header: 'Area', align: 'left' },
                        { key: 'value', header: 'Value', align: 'right', format: (v) => v != null ? formatFn(v as number) : '—' },
                        { key: 'ci', header: '95% CI', align: 'right' },
                        { key: 'type', header: 'Type', align: 'left' },
                      ] as TableColumn[]}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Peer Comparison: {SYSTEM_LEVEL_NAMES[selectedLevelId]}s
                    {parentAreaName && ` in ${parentAreaName}`}
                  </CardTitle>
                  <CardDescription>
                    {indicator?.IndicatorShortName} - {indicator?.FormatDisplayName}
                    {peers.length >= 30 && ' (showing first 30 peers)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-[200px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : peerTableData.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                      No peer data available
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">95% CI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {peerTableData.map((row, idx) => (
                          <TableRow
                            key={row.area.AreaCode}
                            className={row.isSelected ? 'bg-primary/10 font-medium' : ''}
                          >
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              {row.area.AreaName
                                .replace(/^NHS /, '')
                                .replace(/ Integrated Care Board$/, '')
                                .replace(/ Primary Care Network$/, '')}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.value !== null ? formatFn(row.value) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {row.lowerCI !== null && row.upperCI !== null
                                ? `${formatFn(row.lowerCI)} - ${formatFn(row.upperCI)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              {!selectedArea ? 'Select an area above to start comparing' : 'Select an indicator to view comparison'}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
