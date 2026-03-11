'use client';

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCSV } from '@/lib/utils/csv';

export interface TableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown) => string;
}

export interface ChartTableToggleProps {
  chart: ReactNode;
  tableData: Record<string, unknown>[];
  columns: TableColumn[];
  defaultView?: 'chart' | 'table';
  className?: string;
  filename?: string;
  /** Controlled mode: pass viewMode from parent (use with useChartTableActions) */
  viewMode?: 'chart' | 'table';
}

/** Hook to manage chart/table state + export. Place the returned `actions` element wherever you want. */
export function useChartTableActions(opts: {
  tableData: Record<string, unknown>[];
  columns: TableColumn[];
  filename?: string;
}) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const toggleView = useCallback(() => {
    setViewMode((prev) => (prev === 'chart' ? 'table' : 'chart'));
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!opts.tableData.length) return;
    const rows = opts.tableData.map(row => {
      const out: Record<string, unknown> = {};
      for (const col of opts.columns) {
        const raw = row[col.key];
        out[col.header] = col.format ? col.format(raw) : raw;
      }
      return out;
    });
    downloadCSV(rows, opts.filename ?? 'data');
  }, [opts.tableData, opts.columns, opts.filename]);

  const actions = useMemo(() => (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        title="Download as CSV"
      >
        <Download className="h-3 w-3" />
        CSV
      </button>
      <button
        onClick={toggleView}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {viewMode === 'chart' ? 'View as table' : 'View as chart'}
      </button>
    </div>
  ), [handleExportCSV, toggleView, viewMode]);

  return { viewMode, actions, handleExportCSV };
}

/** Standalone CSV button for sections that don't use ChartTableToggle (e.g. map). */
export function CSVButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      title="Download as CSV"
    >
      <Download className="h-3 w-3" />
      CSV
    </button>
  );
}

export function ChartTableToggle({
  chart,
  tableData,
  columns,
  defaultView = 'chart',
  className = '',
  viewMode: controlledViewMode,
}: ChartTableToggleProps) {
  const [internalViewMode, setInternalViewMode] = useState<'chart' | 'table'>(defaultView);
  const viewMode = controlledViewMode ?? internalViewMode;

  // Uncontrolled fallback (backwards compat — not used by refactored sections)
  const isUncontrolled = controlledViewMode === undefined;

  return (
    <div className={className}>
      {/* Uncontrolled mode: show toggle inline */}
      {isUncontrolled && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setInternalViewMode(prev => prev === 'chart' ? 'table' : 'chart')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {viewMode === 'chart' ? 'View as table' : 'View as chart'}
          </button>
        </div>
      )}

      {viewMode === 'chart' ? (
        chart
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => {
                    const value = row[col.key];
                    const displayValue = col.format ? col.format(value) : String(value ?? '—');
                    return (
                      <TableCell
                        key={col.key}
                        className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                      >
                        {displayValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
