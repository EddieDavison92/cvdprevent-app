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
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
