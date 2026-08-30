export interface TargetAnalysisInput {
  currentValue: number | null | undefined;
  targetValue: number | null | undefined;
  numerator: number | null | undefined;
  denominator: number | null | undefined;
  lowerIsBetter: boolean;
  isPercentage: boolean;
}

export interface TargetAnalysis {
  met: boolean;
  estimatedPatients: number | null;
}

/**
 * Assesses a published target. Patient estimates are only meaningful for
 * higher-is-better percentage measures with a numerator and denominator.
 */
export function analyseTarget({
  currentValue,
  targetValue,
  numerator,
  denominator,
  lowerIsBetter,
  isPercentage,
}: TargetAnalysisInput): TargetAnalysis | null {
  if (currentValue == null || targetValue == null) return null;

  const met = lowerIsBetter ? currentValue <= targetValue : currentValue >= targetValue;
  if (met || lowerIsBetter || !isPercentage || numerator == null || denominator == null || denominator <= 0) {
    return { met, estimatedPatients: null };
  }

  const rawEstimate = (targetValue / 100) * denominator - numerator;
  if (rawEstimate <= 0) return { met, estimatedPatients: null };
  // CVDPREVENT subnational counts are rounded, so avoid false precision.
  const estimatedPatients = Math.max(5, Math.round(rawEstimate / 5) * 5);
  return { met, estimatedPatients };
}
