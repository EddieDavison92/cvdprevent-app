'use client';

import { useId } from 'react';

interface SparklineProps {
  data: { x: string; y: number | null }[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 200,
  height = 56,
  color = '#005EB8',
  showArea = true,
  className,
}: SparklineProps) {
  const id = useId();
  const gradientId = `sparkline-grad-${id}`;

  // Filter to valid points, preserving order
  const validPoints = data
    .map((d, i) => ({ i, y: d.y }))
    .filter((d): d is { i: number; y: number } => d.y !== null);

  if (validPoints.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        {validPoints.length === 1 && (
          <circle cx={width / 2} cy={height / 2} r={2.5} fill={color} />
        )}
      </svg>
    );
  }

  const pad = { top: 6, right: 6, bottom: 6, left: 2 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yValues = validPoints.map((p) => p.y);
  const dataMin = Math.min(...yValues);
  const dataMax = Math.max(...yValues);
  const dataRange = dataMax - dataMin;
  // Pad the range to 3x the data spread (centered), so real trends are visible
  // but small noise doesn't fill the entire height
  const padding = Math.max(dataRange, dataMax * 0.1);
  const minY = Math.max(0, dataMin - padding);
  const maxY = dataMax + padding;
  const yRange = maxY - minY || 1;

  const total = data.length;

  const coords = validPoints.map((p) => ({
    x: pad.left + (p.i / (total - 1)) * plotW,
    y: pad.top + plotH - ((p.y - minY) / yRange) * plotH,
  }));

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  // Area polygon: line + close along bottom
  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPoints = linePoints + ` ${last.x},${pad.top + plotH} ${first.x},${pad.top + plotH}`;

  return (
    <svg width={width} height={height} className={className} role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {showArea && (
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      )}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  );
}
