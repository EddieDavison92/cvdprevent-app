import { Badge } from '@/components/ui/badge';
import { Search, TrendingDown, TrendingUp } from 'lucide-react';

interface PolarityBadgeProps {
  lowerIsBetter: boolean;
  recordedPrevalence?: boolean;
}

export function PolarityBadge({ lowerIsBetter, recordedPrevalence = false }: PolarityBadgeProps) {
  const Icon = recordedPrevalence ? Search : lowerIsBetter ? TrendingDown : TrendingUp;
  const label = recordedPrevalence
    ? 'Higher recording may indicate better detection'
    : lowerIsBetter ? 'Lower is better' : 'Higher is better';
  return (
    <Badge variant="outline" className="max-w-full shrink gap-1 whitespace-normal">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
