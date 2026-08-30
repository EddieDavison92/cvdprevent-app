import { describe, expect, it } from 'vitest';
import { formatDiff } from '@/lib/utils/format';
import { getTrendDirection, summariseTrend } from '@/lib/utils/trend';

describe('trend presentation', () => {
  it('recognises a visible increase on a narrow percentage scale', () => {
    const values = [0.68, 0.72, 0.74, 0.75, 0.75, 0.77, 0.79, 0.79, 0.81];
    expect(getTrendDirection(0.02, values)).toBe('up');
    expect(formatDiff(0.02, '%')).toBe('+0.02pp');
  });

  it('keeps changes below the displayed precision flat', () => {
    expect(getTrendDirection(0.003, [0.79, 0.793])).toBe('flat');
  });

  it('uses the recent range for measures on a wider scale', () => {
    expect(getTrendDirection(0.2, [10, 20, 30])).toBe('flat');
    expect(getTrendDirection(1, [10, 20, 30])).toBe('up');
  });

  it('classifies change from the latest two published periods', () => {
    const trend = summariseTrend([10, 50, 52]);
    expect(trend.latest).toMatchObject({ change: 2, direction: 'up' });
    expect(trend.overall).toEqual(trend.latest);
  });

  it('does not classify a single published value', () => {
    expect(summariseTrend([48.6]).latest).toBeNull();
  });
});
