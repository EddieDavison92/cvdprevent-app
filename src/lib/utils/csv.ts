/**
 * Generate a CSV string from rows of key-value objects.
 * Handles commas, quotes, and newlines in values.
 */
export function generateCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

/** Trigger a CSV file download in the browser. BOM prefix ensures Excel detects UTF-8. */
export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  const csv = generateCSV(rows);
  if (!csv) return;

  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
