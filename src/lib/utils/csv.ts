export type CSVMetadata = [string, string][];

const escape = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

/**
 * Generate a CSV string from rows of key-value objects.
 * Optional metadata rows are prepended before the header row.
 */
export function generateCSV(rows: Record<string, unknown>[], metadata?: CSVMetadata): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const metaLines = metadata?.map(([key, value]) => `${escape(key)},${escape(value)}`) ?? [];

  const lines = [
    ...metaLines,
    ...(metaLines.length ? [''] : []), // blank line between metadata and data
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

/** Trigger a CSV file download in the browser. BOM prefix ensures Excel detects UTF-8. */
export function downloadCSV(rows: Record<string, unknown>[], filename: string, metadata?: CSVMetadata) {
  const csv = generateCSV(rows, metadata);
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
