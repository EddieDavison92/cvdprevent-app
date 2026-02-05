'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, Building2, Building, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAreas, useAllAreas } from '@/lib/hooks';
import { SYSTEM_LEVELS, type Area } from '@/lib/api/types';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProps {
  timePeriodId: number | undefined;
  selectedArea: Area | null;
  onSelectArea: (area: Area, levelId: number) => void;
}

const LEVEL_ICONS: Record<number, React.ReactNode> = {
  [SYSTEM_LEVELS.ENGLAND]: <Globe className="h-4 w-4" />,
  [SYSTEM_LEVELS.REGION]: <MapPin className="h-4 w-4" />,
  [SYSTEM_LEVELS.ICB]: <Building2 className="h-4 w-4" />,
  [SYSTEM_LEVELS.SUB_ICB]: <Building className="h-4 w-4" />,
  [SYSTEM_LEVELS.PCN]: <Users className="h-4 w-4" />,
};

export function Sidebar({ timePeriodId, selectedArea, onSelectArea }: SidebarProps) {
  const { regions, icbs, subIcbs, pcns, isLoading } = useAllAreas(timePeriodId);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedIcbs, setExpandedIcbs] = useState<Set<string>>(new Set());
  const [expandedSubIcbs, setExpandedSubIcbs] = useState<Set<string>>(new Set());

  const toggleRegion = (code: string) => {
    const next = new Set(expandedRegions);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpandedRegions(next);
  };

  const toggleIcb = (code: string) => {
    const next = new Set(expandedIcbs);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpandedIcbs(next);
  };

  const toggleSubIcb = (code: string) => {
    const next = new Set(expandedSubIcbs);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpandedSubIcbs(next);
  };

  if (isLoading) {
    return (
      <aside className="w-72 border-r border-border bg-white p-4">
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 overflow-y-auto border-r border-border bg-white">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Geography</h2>

        {/* England */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 text-left',
            selectedArea?.AreaCode === 'E92000001' && 'bg-accent'
          )}
          onClick={() =>
            onSelectArea(
              { AreaCode: 'E92000001', AreaID: 1, AreaName: 'England', Parents: [], SystemLevelID: SYSTEM_LEVELS.ENGLAND, SystemLevelName: 'England' },
              SYSTEM_LEVELS.ENGLAND
            )
          }
        >
          {LEVEL_ICONS[SYSTEM_LEVELS.ENGLAND]}
          <span>England</span>
        </Button>

        {/* Regions */}
        <div className="mt-2 space-y-1">
          {regions?.map((region) => {
            const isExpanded = expandedRegions.has(region.AreaCode);
            const regionIcbs = icbs?.filter((i) => i.Parents.includes(region.AreaID)) || [];

            return (
              <div key={region.AreaCode}>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleRegion(region.AreaCode)}
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-1 justify-start gap-2 text-left text-sm',
                      selectedArea?.AreaCode === region.AreaCode && 'bg-accent'
                    )}
                    onClick={() => onSelectArea(region, SYSTEM_LEVELS.REGION)}
                  >
                    {LEVEL_ICONS[SYSTEM_LEVELS.REGION]}
                    <span className="truncate">{region.AreaName}</span>
                  </Button>
                </div>

                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {regionIcbs.map((icb) => {
                      const isIcbExpanded = expandedIcbs.has(icb.AreaCode);
                      const icbSubIcbs = subIcbs?.filter((s) => s.Parents.includes(icb.AreaID)) || [];

                      return (
                        <div key={icb.AreaCode}>
                          <div className="flex items-center">
                            {icbSubIcbs.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleIcb(icb.AreaCode)}
                              >
                                {isIcbExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              className={cn(
                                'flex-1 justify-start gap-2 text-left text-xs',
                                selectedArea?.AreaCode === icb.AreaCode && 'bg-accent',
                                icbSubIcbs.length === 0 && 'ml-6'
                              )}
                              onClick={() => onSelectArea(icb, SYSTEM_LEVELS.ICB)}
                            >
                              {LEVEL_ICONS[SYSTEM_LEVELS.ICB]}
                              <span className="truncate">
                                {icb.AreaName.replace('NHS ', '').replace(' Integrated Care Board', '')}
                              </span>
                            </Button>
                          </div>

                          {isIcbExpanded && (
                            <div className="ml-4 space-y-1">
                              {icbSubIcbs.map((subIcb) => {
                                const isSubIcbExpanded = expandedSubIcbs.has(subIcb.AreaCode);
                                const subIcbPcns =
                                  pcns?.filter((p) => p.Parents.includes(subIcb.AreaID)) || [];

                                return (
                                  <div key={subIcb.AreaCode}>
                                    <div className="flex items-center">
                                      {subIcbPcns.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => toggleSubIcb(subIcb.AreaCode)}
                                        >
                                          {isSubIcbExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        className={cn(
                                          'flex-1 justify-start gap-2 text-left text-xs',
                                          selectedArea?.AreaCode === subIcb.AreaCode && 'bg-accent',
                                          subIcbPcns.length === 0 && 'ml-6'
                                        )}
                                        onClick={() => onSelectArea(subIcb, SYSTEM_LEVELS.SUB_ICB)}
                                      >
                                        {LEVEL_ICONS[SYSTEM_LEVELS.SUB_ICB]}
                                        <span className="truncate">{subIcb.AreaName}</span>
                                      </Button>
                                    </div>

                                    {isSubIcbExpanded && (
                                      <div className="ml-10 space-y-1">
                                        {subIcbPcns.map((pcn) => (
                                          <Button
                                            key={pcn.AreaCode}
                                            variant="ghost"
                                            className={cn(
                                              'w-full justify-start gap-2 text-left text-xs',
                                              selectedArea?.AreaCode === pcn.AreaCode && 'bg-accent'
                                            )}
                                            onClick={() => onSelectArea(pcn, SYSTEM_LEVELS.PCN)}
                                          >
                                            {LEVEL_ICONS[SYSTEM_LEVELS.PCN]}
                                            <span className="truncate">{pcn.AreaName}</span>
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
