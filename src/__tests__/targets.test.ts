import { describe, expect, it } from 'vitest';
import { analyseTarget } from '@/lib/utils/targets';

describe('published target analysis', () => {
  it('estimates additional patients for a higher-is-better percentage target', () => {
    expect(analyseTarget({
      currentValue: 89.43,
      targetValue: 95,
      numerator: 15_755,
      denominator: 17_620,
      lowerIsBetter: false,
      isPercentage: true,
    })).toEqual({ met: false, estimatedPatients: 985 });
  });

  it('does not create patient estimates for rate measures', () => {
    expect(analyseTarget({
      currentValue: 310.2,
      targetValue: 300,
      numerator: 100,
      denominator: 50_000,
      lowerIsBetter: true,
      isPercentage: false,
    })).toEqual({ met: false, estimatedPatients: null });
  });

  it('recognises a met target', () => {
    expect(analyseTarget({
      currentValue: 96,
      targetValue: 95,
      numerator: 960,
      denominator: 1_000,
      lowerIsBetter: false,
      isPercentage: true,
    })).toEqual({ met: true, estimatedPatients: null });
  });
});
