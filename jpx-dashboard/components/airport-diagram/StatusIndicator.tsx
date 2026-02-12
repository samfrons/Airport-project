'use client';

import type { RunwayStatus, TaxiwayStatus } from '@/types/airportDiagram';

interface StatusIndicatorProps {
  status: RunwayStatus | TaxiwayStatus;
  x: number;
  y: number;
}

export function StatusIndicator({ status, x, y }: StatusIndicatorProps) {
  if (status === 'open') return null;

  const isClosed = status === 'closed';
  const label = isClosed ? 'CLOSED' : 'RESTRICTED';
  const bgColor = isClosed ? 'var(--status-closed)' : 'var(--curfew-color)';

  return (
    <g className="status-indicator pointer-events-none">
      {/* Background pill */}
      <rect
        x={x - 30}
        y={y - 10}
        width="60"
        height="20"
        fill={bgColor}
      />

      {/* Status text */}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        letterSpacing="0.05em"
      >
        {label}
      </text>

      {/* X marks for closed runways */}
      {isClosed && (
        <>
          <line
            x1={x - 60}
            y1={y - 15}
            x2={x - 40}
            y2={y + 15}
            stroke={bgColor}
            strokeWidth="4"
          />
          <line
            x1={x - 40}
            y1={y - 15}
            x2={x - 60}
            y2={y + 15}
            stroke={bgColor}
            strokeWidth="4"
          />
          <line
            x1={x + 40}
            y1={y - 15}
            x2={x + 60}
            y2={y + 15}
            stroke={bgColor}
            strokeWidth="4"
          />
          <line
            x1={x + 60}
            y1={y - 15}
            x2={x + 40}
            y2={y + 15}
            stroke={bgColor}
            strokeWidth="4"
          />
        </>
      )}
    </g>
  );
}
