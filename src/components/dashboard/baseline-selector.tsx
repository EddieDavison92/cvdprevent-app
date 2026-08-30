'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganisation } from '@/providers/organisation-context';
import { buildAreaHierarchy } from '@/lib/api';
import { useLatestTimePeriod } from '@/lib/hooks/use-time-periods';
import { useAllAreas } from '@/lib/hooks/use-areas';
import { SYSTEM_LEVEL_NAMES, SYSTEM_LEVEL_ORDER } from '@/lib/constants/geography';
import type { Area } from '@/lib/api/types';
import { Label } from '@/components/ui/label';
import { Target, RotateCcw } from 'lucide-react';
import { AreaChangeDialog } from './area-change-dialog';

// England default
const ENGLAND_AREA: Area = {
  AreaCode: 'E92000001',
  AreaID: 1,
  AreaName: 'England',
  Parents: [],
  SystemLevelID: 1,
  SystemLevelName: 'England',
};

const levelRank = (levelId: number) => {
  const index = SYSTEM_LEVEL_ORDER.indexOf(levelId as (typeof SYSTEM_LEVEL_ORDER)[number]);
  return index === -1 ? SYSTEM_LEVEL_ORDER.length : index;
};

export function BaselineSelector() {
  const { organisation, baseline, setBaseline, resetBaseline, isBaselineEngland } = useOrganisation();
  const { data: latestPeriod } = useLatestTimePeriod('standard');
  const timePeriodId = latestPeriod?.TimePeriodID;

  const { areasByLevel, isLoading: isLoadingAreas } = useAllAreas(timePeriodId);

  // Build list of available baselines: England + every ancestor
  // (e.g. PCN -> Sub-ICB, ICB and Region), broadest level first
  const baselineOptions = useMemo(() => {
    const options: Area[] = [ENGLAND_AREA];

    if (organisation && organisation.SystemLevelID !== 1) {
      const ancestors = buildAreaHierarchy(organisation.AreaCode, areasByLevel)
        .filter((a) => a.AreaID !== organisation.AreaID && a.AreaID !== ENGLAND_AREA.AreaID)
        .sort((a, b) => levelRank(a.SystemLevelID) - levelRank(b.SystemLevelID));
      options.push(...ancestors);
    }

    // Keep the current selection renderable while the area lists load
    if (!options.some((a) => a.AreaID === baseline.AreaID)) {
      options.push(baseline);
    }

    return options;
  }, [organisation, areasByLevel, baseline]);

  // A persisted baseline can outlive an area change (e.g. arriving via a
  // shared ?area= link). Once the hierarchy is known, drop any baseline
  // that is not an ancestor of the current organisation.
  useEffect(() => {
    // size check: with a level list missing the hierarchy walk stops early
    // and would wrongly reset a valid higher-level baseline
    if (isBaselineEngland || isLoadingAreas || !organisation || areasByLevel.size < 4) return;
    const ancestors = buildAreaHierarchy(organisation.AreaCode, areasByLevel);
    if (!ancestors.some((a) => a.AreaID === baseline.AreaID)) {
      resetBaseline();
    }
  }, [isBaselineEngland, isLoadingAreas, organisation, areasByLevel, baseline, resetBaseline]);

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
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="baseline-select" className="flex items-center gap-1.5 text-sm text-gray-600">
        <Target className="h-4 w-4 text-gray-500" />
        Compare with
      </Label>
      <Select value={baseline.AreaID.toString()} onValueChange={handleChange}>
        <SelectTrigger id="baseline-select" className="h-8 w-[200px] bg-white text-sm">
          <SelectValue>{getDisplayName(baseline)}</SelectValue>
        </SelectTrigger>
        {/* popper keeps the list below the trigger; item-aligned clips at the viewport top when the last item is selected */}
        <SelectContent position="popper">
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
          aria-label="Reset comparison to England"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      <AreaChangeDialog className="hidden sm:inline-flex" />
    </div>
  );
}
