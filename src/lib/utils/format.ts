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

// Format axis tick labels - strip unnecessary trailing decimals (e.g. "60.0%" -> "60%")
export function formatTick(value: number, format: string): string {
  const formatted = formatValue(value, format);
  return formatted.replace(/\.0(%?)$/, '$1');
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
  };
  return names[condition] ?? condition;
}
