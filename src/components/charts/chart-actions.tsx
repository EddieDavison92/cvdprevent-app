'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ImageIcon } from 'lucide-react';

interface ChartData {
  name: string;
  value: number | null;
  [key: string]: unknown;
}

interface ChartActionsProps {
  chartRef: React.RefObject<{ getEchartsInstance: () => { getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string } } | null>;
  data: ChartData[];
  filename?: string;
  title?: string;
}

export function ChartActions({ chartRef, data, filename = 'chart', title }: ChartActionsProps) {
  const downloadCSV = useCallback(() => {
    if (!data.length) return;

    // Build CSV from data
    const headers = Object.keys(data[0]).filter(k => k !== 'isHighlighted');
    const rows = data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return String(val);
      }).join(',')
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, filename]);

  const downloadPNG = useCallback(() => {
    if (!chartRef.current) return;
    
    try {
      const instance = chartRef.current.getEchartsInstance();
      const url = instance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.png`;
      link.click();
    } catch (e) {
      console.error('Failed to export chart:', e);
    }
  }, [chartRef, filename]);

  return (
    <div className="flex items-center gap-2">
      {title && <span className="text-sm text-muted-foreground mr-2">{title}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={downloadCSV}
        className="gap-1.5"
        title="Download data as CSV"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={downloadPNG}
        className="gap-1.5"
        title="Download chart as PNG"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        PNG
      </Button>
    </div>
  );
}

// Hook to create a chart ref for the actions component
export function useChartRef() {
  return useRef<{ getEchartsInstance: () => { getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string } } | null>(null);
}
