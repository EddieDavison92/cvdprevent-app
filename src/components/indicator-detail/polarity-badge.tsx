import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface PolarityBadgeProps {
  lowerIsBetter: boolean;
}

export function PolarityBadge({ lowerIsBetter }: PolarityBadgeProps) {
  const Icon = lowerIsBetter ? TrendingDown : TrendingUp;
  const label = lowerIsBetter ? 'Lower is better' : 'Higher is better';
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
