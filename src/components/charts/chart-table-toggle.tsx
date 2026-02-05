'use client';

import { useState, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface TableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown) => string;
}

export interface ChartTableToggleProps {
  /** The chart component to render in chart mode */
  chart: ReactNode;
  /** Data for the table view */
  tableData: Record<string, unknown>[];
  /** Column definitions for the table */
  columns: TableColumn[];
  /** Initial view mode */
  defaultView?: 'chart' | 'table';
  /** Optional class name for the container */
  className?: string;
}

export function ChartTableToggle({
  chart,
  tableData,
  columns,
  defaultView = 'chart',
  className = '',
}: ChartTableToggleProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>(defaultView);

  const toggleView = () => {
    setViewMode((prev) => (prev === 'chart' ? 'table' : 'chart'));
  };

  return (
    <div className={className}>
      {/* Toggle button - top right, grey text */}
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleView}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {viewMode === 'chart' ? 'View as table' : 'View as chart'}
        </button>
      </div>

      {/* Content */}
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
