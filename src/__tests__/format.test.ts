import { describe, expect, it } from 'vitest';
import { formatTimePeriod, parsePeriodDate, stripTrailingZeros } from '@/lib/utils/format';

const sortPeriods = (labels: string[]) =>
  [...labels].sort((a, b) => parsePeriodDate(a).getTime() - parsePeriodDate(b).getTime());

describe('parsePeriodDate', () => {
  it('orders standard periods chronologically, not alphabetically', () => {
    const labels = ['To December 2025', 'To June 2022', 'To March 2026', 'To September 2023'].map(formatTimePeriod);
    expect(sortPeriods(labels)).toEqual(['Jun 22', 'Sep 23', 'Dec 25', 'Mar 26']);
  });

  it('uses the end month of rolling outcome periods', () => {
    const labels = ['Apr 2025 - Mar 2026', 'Oct 2024 - Sep 2025'].map(formatTimePeriod);
    expect(sortPeriods(labels)).toEqual(['Oct 24 - Sep 25', 'Apr 25 - Mar 26']);
  });
});

describe('stripTrailingZeros', () => {
  it('drops trailing decimal zeros and keeps suffixes', () => {
    expect(stripTrailingZeros('0.00%')).toBe('0%');
    expect(stripTrailingZeros('0.50%')).toBe('0.5%');
    expect(stripTrailingZeros('60.0%')).toBe('60%');
    expect(stripTrailingZeros('1.25')).toBe('1.25');
    expect(stripTrailingZeros('100%')).toBe('100%');
    expect(stripTrailingZeros('1,000')).toBe('1,000');
  });
});
