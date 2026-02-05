'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganisation } from '@/providers/organisation-context';
import { fetchApi } from '@/lib/api/client';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import type { Area } from '@/lib/api/types';
import { Target, ChevronDown, RotateCcw } from 'lucide-react';

interface AreaDetailsResponse {
  areaDetails: Area & { ParentAreaList?: Area[] };
}

// Fetch area details including parents
async function fetchAreaWithParents(areaId: number, timePeriodId: number): Promise<Area[]> {
  try {
    const response = await fetchApi<AreaDetailsResponse>(
      `/area/${areaId}/details?timePeriodID=${timePeriodId}`
    );
    const parents = response.areaDetails.ParentAreaList ?? [];
    return parents.map((p) => ({
      AreaCode: p.AreaCode,
      AreaID: p.AreaID,
      AreaName: p.AreaName,
      Parents: [],
      SystemLevelID: p.SystemLevelID,
      SystemLevelName: p.SystemLevelName ?? SYSTEM_LEVEL_NAMES[p.SystemLevelID] ?? 'Unknown',
    }));
  } catch {
    return [];
  }
}

// England default
const ENGLAND_AREA: Area = {
  AreaCode: 'E92000001',
  AreaID: 1,
  AreaName: 'England',
  Parents: [],
  SystemLevelID: 1,
  SystemLevelName: 'England',
};

export function BaselineSelector() {
  const { organisation, baseline, setBaseline, resetBaseline, isBaselineEngland } = useOrganisation();
  const { data: latestPeriod } = useLatestTimePeriod('standard');
  const timePeriodId = latestPeriod?.TimePeriodID;

  // Fetch parent hierarchy for current organisation
  const { data: parentAreas } = useQuery({
    queryKey: ['areaParents', organisation?.AreaID, timePeriodId],
    queryFn: () => fetchAreaWithParents(organisation!.AreaID, timePeriodId!),
    enabled: !!organisation && organisation.SystemLevelID !== 1 && !!timePeriodId,
    staleTime: Infinity,
  });

  // Build list of available baselines (England + parents in hierarchy)
  const baselineOptions = useMemo(() => {
    const options: Area[] = [ENGLAND_AREA];
    
    if (parentAreas) {
      // Sort by system level (Region before ICB before Sub-ICB), exclude England (already added)
      const sorted = [...parentAreas]
        .filter((a) => a.AreaID !== ENGLAND_AREA.AreaID)
        .sort((a, b) => a.SystemLevelID - b.SystemLevelID);
      options.push(...sorted);
    }
    
    return options;
  }, [parentAreas]);

  // Get display name for an area
  const getDisplayName = (area: Area) => {
    if (area.SystemLevelID === 1) return 'England';
    
    // Clean up common suffixes
    return area.AreaName
      .replace(/^NHS /, '')
      .replace(/ Integrated Care Board$/, '')
      .replace(/ Primary Care Network$/, '');
  };

  // Get baseline label
  const getBaselineLabel = (area: Area) => {
    const name = getDisplayName(area);
    const level = SYSTEM_LEVEL_NAMES[area.SystemLevelID] ?? '';
    if (area.SystemLevelID === 1) return 'England (National)';
    return `${name} (${level})`;
  };

  const handleChange = (areaId: string) => {
    const id = parseInt(areaId, 10);
    const selected = baselineOptions.find((a) => a.AreaID === id);
    if (selected) {
      setBaseline(selected);
    }
  };

  // Don't show selector if viewing England (nothing to compare against)
  if (!organisation || organisation.SystemLevelID === 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 text-gray-500" />
      <span className="text-sm text-gray-600">Compare to:</span>
      <Select value={baseline.AreaID.toString()} onValueChange={handleChange}>
        <SelectTrigger className="w-[220px] h-8 text-sm">
          <SelectValue>{getDisplayName(baseline)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {baselineOptions.map((area) => (
            <SelectItem key={area.AreaID} value={area.AreaID.toString()}>
              {getBaselineLabel(area)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isBaselineEngland && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetBaseline}
          className="h-8 px-2 text-gray-500 hover:text-gray-700"
          title="Reset to England"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
