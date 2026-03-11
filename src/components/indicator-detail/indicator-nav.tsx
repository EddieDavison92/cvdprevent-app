'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Indicator, IndicatorRawData } from '@/lib/api/types';
import { formatValue, extractCondition } from '@/lib/utils/format';
import { buildUrl } from '@/lib/utils/url';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IndicatorNavProps {
  indicators: Indicator[];
  currentId: number;
  dataByIndicator: Map<number, IndicatorRawData>;
  basePath?: string;
}

export function IndicatorNav({ indicators, currentId, dataByIndicator, basePath = '/dashboard' }: IndicatorNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [canScroll, setCanScroll] = useState(false);

  // Auto-filter to current indicator's condition
  const currentCondition = useMemo(() => {
    const current = indicators.find((ind) => ind.IndicatorID === currentId);
    return current ? extractCondition(current.IndicatorShortName) : null;
  }, [indicators, currentId]);

  const filteredIndicators = useMemo(() => {
    if (!currentCondition) return indicators;
    return indicators.filter((ind) => extractCondition(ind.IndicatorShortName) === currentCondition);
  }, [indicators, currentCondition]);

  // Check if scrolling is needed
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const checkScroll = () => {
      setCanScroll(container.scrollWidth > container.clientWidth);
    };

    const timer = setTimeout(checkScroll, 50);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [filteredIndicators.length]);

  // Scroll current indicator into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const currentButton = container.querySelector(`[data-indicator-id="${currentId}"]`);
    if (currentButton) {
      currentButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentId]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  const buildIndicatorLink = (indicatorId: number) =>
    buildUrl(`${basePath}/${indicatorId}`, searchParams);

  if (filteredIndicators.length <= 1) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mb-6">
        {currentCondition && (
          <p className="text-xs text-gray-500 mb-2 font-medium">{currentCondition} indicators</p>
        )}

        <div className="flex items-center gap-2">
          {canScroll && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => scroll('left')}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredIndicators.map((indicator) => {
              const data = dataByIndicator.get(indicator.IndicatorID);
              const isActive = indicator.IndicatorID === currentId;

              return (
                <Tooltip key={indicator.IndicatorID}>
                  <TooltipTrigger asChild>
                    <Link
                      href={buildIndicatorLink(indicator.IndicatorID)}
                      data-indicator-id={indicator.IndicatorID}
                      className={cn(
                        'flex shrink-0 flex-col rounded-lg border px-4 py-2 transition-all',
                        isActive
                          ? 'border-nhs-blue bg-nhs-blue text-white'
                          : 'border-gray-200 bg-white hover:border-nhs-blue/50 hover:shadow-sm'
                      )}
                    >
                      <span className={cn('text-xs font-medium', isActive ? 'text-white/80' : 'text-gray-500')}>
                        {indicator.IndicatorCode}
                      </span>
                      <span className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-nhs-blue')}>
                        {data?.Value !== null && data?.Value !== undefined
                          ? formatValue(data.Value, indicator.FormatDisplayName)
                          : '—'}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{indicator.IndicatorShortName}</p>
                      <p className="text-xs opacity-80">{indicator.IndicatorName}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {canScroll && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => scroll('right')}
              className="shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
