'use client';

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCSV, type CSVMetadata } from '@/lib/utils/csv';

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
  metadata?: CSVMetadata;
  fullscreen?: {
    title: string;
    description?: string;
    chart: ReactNode;
  };
}) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    downloadCSV(rows, opts.filename ?? 'data', opts.metadata);
  }, [opts.tableData, opts.columns, opts.filename, opts.metadata]);

  const actions = useMemo(() => (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-700"
          title="Download as CSV"
        >
          <Download className="h-3 w-3" />
          CSV
        </button>
        <button
          type="button"
          onClick={toggleView}
          className="text-xs text-gray-500 transition-colors hover:text-gray-700"
        >
          {viewMode === 'chart' ? 'View as table' : 'View as chart'}
        </button>
        {opts.fullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue focus-visible:ring-offset-2"
            title="View full screen"
            aria-label={`View ${opts.fullscreen.title} full screen`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {opts.fullscreen && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent
            hideClose
            className="flex overflow-hidden rounded-xl p-0"
            style={{
              inset: 'clamp(0.5rem, 2vw, 1.5rem)',
              width: 'auto',
              height: 'auto',
              maxWidth: 'none',
              transform: 'none',
              translate: 'none',
            }}
          >
            <div className="flex min-h-0 w-full flex-col">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <DialogTitle className="truncate text-base sm:text-lg">
                    {opts.fullscreen.title}
                  </DialogTitle>
                  {opts.fullscreen.description && (
                    <DialogDescription className="mt-1 truncate text-xs sm:text-sm">
                      {opts.fullscreen.description}
                    </DialogDescription>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-700"
                    title="Download as CSV"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={toggleView}
                    className="text-xs text-gray-500 transition-colors hover:text-gray-700"
                  >
                    {viewMode === 'chart' ? 'View as table' : 'View as chart'}
                  </button>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue focus-visible:ring-offset-2"
                      title="Exit full screen"
                      aria-label="Exit full screen"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-6">
                <ChartTableToggle
                  chart={opts.fullscreen.chart}
                  tableData={opts.tableData}
                  columns={opts.columns}
                  viewMode={viewMode}
                  className="h-full min-h-0"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  ), [handleExportCSV, isFullscreen, opts.columns, opts.fullscreen, opts.tableData, toggleView, viewMode]);

  return { viewMode, actions, handleExportCSV };
}

/** Standalone CSV button for sections that don't use ChartTableToggle (e.g. map). */
export function CSVButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
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
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {viewMode === 'chart' ? 'View as table' : 'View as chart'}
          </button>
        </div>
      )}

      {viewMode === 'chart' ? (
        chart
      ) : (
        <div className="h-full overflow-auto">
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
