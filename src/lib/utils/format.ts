// Number formatting utilities

export function formatValue(value: number | null, format: string): string {
  if (value === null || value === undefined) return 'N/A';

  if (format.includes('%')) {
    // Use more decimal places for small percentages
    if (Math.abs(value) < 1) {
      return `${value.toFixed(2)}%`;
    }
    return `${value.toFixed(1)}%`;
  }

  if (format.includes('100,000')) {
    if (Math.abs(value) < 1) {
      return value.toFixed(2);
    }
    return value.toFixed(1);
  }

  // Default formatting
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  if (Math.abs(value) < 1) {
    return value.toFixed(2);
  }
  return value.toFixed(1);
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-GB').format(value);
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

export function formatConfidenceInterval(lower: number | null | undefined, upper: number | null | undefined): string {
  if (lower == null || upper == null) return '';
  return `(${lower.toFixed(1)} - ${upper.toFixed(1)})`;
}

export function formatTimePeriod(name: string): string {
  // "To September 2025" -> "Sep 2025"
  // "Jul 2024 - Jun 2025" -> "Jul 24 - Jun 25"
  return name
    .replace('To ', '')
    .replace('September', 'Sep')
    .replace('December', 'Dec')
    .replace('March', 'Mar')
    .replace('June', 'Jun')
    .replace(/(\d{4})/g, (_, year) => year.slice(2));
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Period end date from a formatTimePeriod label: "Jun 22" or "Jul 24 - Jun 25" (uses the end). */
export function parsePeriodDate(period: string): Date {
  const match = period.match(/([A-Za-z]{3})\s*(\d{2})\s*$/);
  if (match && match[1] in MONTHS) {
    return new Date(2000 + parseInt(match[2], 10), MONTHS[match[1]], 1);
  }
  return new Date(period);
}

/** Drops trailing decimal zeros from a formatted label: "0.50%" -> "0.5%", "0.00%" -> "0%". */
export function stripTrailingZeros(label: string): string {
  return label.replace(/(\.\d*?)0+(\D*)$/, '$1$2').replace(/\.(\D*)$/, '$1');
}

// Format axis tick labels without trailing decimal zeros (e.g. "60.0%" -> "60%")
export function formatTick(value: number, format: string): string {
  return stripTrailingZeros(formatValue(value, format));
}

/**
 * Format a value using the indicator's FormatDisplayName.
 * Convenience wrapper so callers don't need to pass format strings around.
 */
export function formatIndicatorValue(value: number | null, formatDisplayName: string): string {
  return formatValue(value, formatDisplayName);
}

/**
 * Format a gap/diff value (e.g. trend or baseline comparison).
 * Appends "pp" for percentage indicators, nothing for rates.
 */
export function formatDiff(diff: number, formatDisplayName: string): string {
  const suffix = formatDisplayName.includes('%') ? 'pp' : '';
  const decimals = diff !== 0 && Math.abs(diff) < 0.1 ? 2 : 1;
  return `${diff > 0 ? '+' : ''}${diff.toFixed(decimals)}${suffix}`;
}

/**
 * Format an absolute gap value for display in badges (no sign prefix).
 */
export function formatAbsDiff(diff: number, formatDisplayName: string): string {
  const suffix = formatDisplayName.includes('%') ? 'pp' : '';
  const decimals = diff !== 0 && Math.abs(diff) < 0.1 ? 2 : 1;
  return `${Math.abs(diff).toFixed(decimals)}${suffix}`;
}

// Extract condition code from indicator short name (e.g., "CKD: ..." -> "CKD")
export function extractCondition(indicatorShortName: string): string {
  const colonIndex = indicatorShortName.indexOf(':');
  if (colonIndex > 0) {
    return indicatorShortName.substring(0, colonIndex).trim();
  }
  return 'Other';
}

// Get display name for condition code
export function getConditionDisplayName(condition: string): string {
  const names: Record<string, string> = {
    CKD: 'Chronic Kidney Disease',
    AF: 'Atrial Fibrillation',
    DM: 'Diabetes',
    NDH: 'Non-Diabetic Hyperglycaemia',
    Hypertension: 'Hypertension',
    Cholesterol: 'Cholesterol',
    Smoking: 'Smoking',
    CVD: 'Cardiovascular Disease',
    HF: 'Heart Failure',
    CVKM: 'Cardiovascular–Kidney–Metabolic',
    FH: 'Familial Hypercholesterolaemia',
  };
  return names[condition] ?? condition;
}
