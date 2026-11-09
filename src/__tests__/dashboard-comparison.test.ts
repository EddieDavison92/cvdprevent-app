import { describe, expect, it } from 'vitest';
import { classifyBaselineGap } from '@/lib/constants/comparison';

describe('dashboard baseline classification', () => {
  it('does not count empty area data as in line', () => {
    const emptyAreaData = {} as { Value?: number };

    expect(classifyBaselineGap(emptyAreaData.Value, 70, false)).toBeNull();
    expect(classifyBaselineGap(70, emptyAreaData.Value, false)).toBeNull();
    expect(classifyBaselineGap(undefined, undefined, false)).toBeNull();
    expect(classifyBaselineGap(null, 70, false)).toBeNull();
    expect(classifyBaselineGap(Number.NaN, 70, true)).toBeNull();
  });

  it('counts a finite gap within tolerance as in line', () => {
    expect(classifyBaselineGap(70.2, 70, false)).toBe('inLine');
    expect(classifyBaselineGap(0, 0, true)).toBe('inLine');
  });

  it('counts a material gap in the favourable direction', () => {
    expect(classifyBaselineGap(80, 70, false)).toBe('favourable');
    expect(classifyBaselineGap(10, 20, true)).toBe('favourable');
    expect(classifyBaselineGap(20, 10, true)).toBe('unfavourable');
  });
});
