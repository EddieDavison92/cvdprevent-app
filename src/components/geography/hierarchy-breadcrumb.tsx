'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Area } from '@/lib/api/types';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';

interface HierarchyBreadcrumbProps {
  hierarchy: { area: Area; levelId: number }[];
  onSelectArea: (area: Area, levelId: number) => void;
}

export function HierarchyBreadcrumb({ hierarchy, onSelectArea }: HierarchyBreadcrumbProps) {
  if (hierarchy.length === 0) return null;

  // Reverse to show from England down to current
  const items = [...hierarchy].reverse();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const displayName = item.area.AreaName
          .replace(/^NHS /, '')
          .replace(/ Integrated Care Board$/, '')
          .replace(/ Primary Care Network$/, '');

        return (
          <span key={item.area.AreaCode} className="flex items-center gap-1">
            {isLast ? (
              <span className="font-medium text-foreground">{displayName}</span>
            ) : (
              <>
                <Button
                  variant="link"
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => onSelectArea(item.area, item.levelId)}
                >
                  {displayName}
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </>
            )}
          </span>
        );
      })}
    </nav>
  );
}
