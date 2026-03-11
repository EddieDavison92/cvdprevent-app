'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TimePeriod } from '@/lib/api/types';
import { formatTimePeriod } from '@/lib/utils/format';
import { isStandardPeriod, isOutcomePeriod } from '@/lib/api/time-periods';

interface IndicatorFiltersProps {
  timePeriods: TimePeriod[] | undefined;
  selectedPeriodId: number | undefined;
  onPeriodChange: (periodId: number) => void;
  periodType?: 'all' | 'standard' | 'outcome';
}

export function IndicatorFilters({
  timePeriods,
  selectedPeriodId,
  onPeriodChange,
  periodType = 'all',
}: IndicatorFiltersProps) {
  const filteredPeriods = timePeriods?.filter((p) => {
    if (periodType === 'standard') return isStandardPeriod(p);
    if (periodType === 'outcome') return isOutcomePeriod(p);
    return true;
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Time Period:</label>
        <Select
          value={selectedPeriodId?.toString()}
          onValueChange={(value) => onPeriodChange(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {filteredPeriods?.map((period) => (
              <SelectItem key={period.TimePeriodID} value={period.TimePeriodID.toString()}>
                {formatTimePeriod(period.TimePeriodName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
