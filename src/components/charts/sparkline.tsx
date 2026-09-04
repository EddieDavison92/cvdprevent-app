'use client';

import { useId } from 'react';
import { NHS_COLORS } from '@/lib/constants/colors';

interface SparklineProps {
  data: { x: string; y: number | null }[];
  /** Comparator series aligned with data, drawn dashed behind the line. */
  reference?: Array<number | null>;
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
  reference,
  color = NHS_COLORS.blue,
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
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
        {validPoints.length === 1 && (
          <circle cx={width / 2} cy={height / 2} r={2.5} fill={color} />
        )}
      </svg>
    );
  }

  const pad = { top: 3, right: 6, bottom: 3, left: 2 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const referencePoints = (reference ?? [])
    .map((y, i) => ({ i, y }))
    .filter((d): d is { i: number; y: number } => d.y !== null && d.y !== undefined);
  const yValues = [...validPoints.map((p) => p.y), ...referencePoints.map((p) => p.y)];
  const dataMin = Math.min(...yValues);
  const dataMax = Math.max(...yValues);
  const dataRange = dataMax - dataMin;
  // Scale to the data spread (10% headroom) so direction is legible at any height.
  // Used by both the Trends and Improvement tabs; keep one method.
  const padding = dataRange * 0.1;
  const minY = Math.max(0, dataMin - padding);
  const maxY = dataMax + padding;
  const yRange = maxY - minY || 1;

  const total = data.length;

  const toCoord = (p: { i: number; y: number }) => ({
    x: pad.left + (p.i / (total - 1)) * plotW,
    y: pad.top + plotH - ((p.y - minY) / yRange) * plotH,
  });
  const coords = validPoints.map(toCoord);
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const referenceLine = referencePoints.length >= 2
    ? referencePoints.map(toCoord).map((c) => `${c.x},${c.y}`).join(' ')
    : null;

  // Area polygon: line + close along bottom
  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPoints = linePoints + ` ${last.x},${pad.top + plotH} ${first.x},${pad.top + plotH}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {showArea && (
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      )}
      {referenceLine && (
        <polyline
          points={referenceLine}
          fill="none"
          stroke={NHS_COLORS.midGrey}
          strokeWidth={1.25}
          strokeDasharray="2 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
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
