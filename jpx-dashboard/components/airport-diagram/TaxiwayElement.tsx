'use client';

import type { Taxiway } from '@/types/airportDiagram';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';

interface TaxiwayElementProps {
  taxiway: Taxiway;
  showLabel?: boolean;
}

export function TaxiwayElement({ taxiway, showLabel = true }: TaxiwayElementProps) {
  const { selection, setSelection, showTooltip, hideTooltip } =
    useAirportDiagramStore();

  const isSelected = selection.type === 'taxiway' && selection.id === taxiway.id;
  const isClosed = taxiway.status === 'closed';

  const handleClick = () => {
    setSelection({ type: 'taxiway', id: taxiway.id });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const details = [`Status: ${taxiway.status.toUpperCase()}`];

    if (taxiway.notam) {
      details.push(`NOTAM: ${taxiway.notam}`);
    }

    showTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      title: `Taxiway ${taxiway.name}`,
      details,
    });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  // Calculate label position from first segment
  const firstSegment = taxiway.segments[0];
  const pathMatch = firstSegment.path.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
  const labelX = pathMatch ? parseFloat(pathMatch[1]) : 0;
  const labelY = pathMatch ? parseFloat(pathMatch[2]) : 0;

  return (
    <g className="taxiway-element">
      {/* Taxiway segments */}
      {taxiway.segments.map((segment) => (
        <path
          key={segment.id}
          d={segment.path}
          fill="none"
          stroke={isClosed ? 'var(--status-closed)' : 'var(--taxiway-surface)'}
          strokeWidth={isSelected ? 14 : 12}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="cursor-pointer transition-colors"
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          opacity={isClosed ? 0.5 : 1}
        />
      ))}

      {/* Taxiway edge markings */}
      {taxiway.segments.map((segment) => (
        <path
          key={`${segment.id}-edge`}
          d={segment.path}
          fill="none"
          stroke="var(--bg-surface)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0"
          pointerEvents="none"
          opacity={0.15}
        />
      ))}

      {/* Selection highlight */}
      {isSelected && taxiway.segments.map((segment) => (
        <path
          key={`${segment.id}-highlight`}
          d={segment.path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
          opacity={0.4}
        />
      ))}

      {/* Taxiway label (only if showLabel is true) */}
      {showLabel && (
        <g className="pointer-events-none">
          <circle
            cx={labelX}
            cy={labelY - 18}
            r="12"
            fill="var(--taxiway-surface)"
            stroke="var(--bg-surface)"
            strokeWidth="2"
          />
          <text
            x={labelX}
            y={labelY - 14}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize="9"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {taxiway.name.replace('TW', '')}
          </text>
        </g>
      )}

      {/* Closed X marker */}
      {isClosed && (
        <g className="pointer-events-none">
          <line
            x1={labelX - 8}
            y1={labelY - 8}
            x2={labelX + 8}
            y2={labelY + 8}
            stroke="var(--status-closed)"
            strokeWidth="3"
          />
          <line
            x1={labelX + 8}
            y1={labelY - 8}
            x2={labelX - 8}
            y2={labelY + 8}
            stroke="var(--status-closed)"
            strokeWidth="3"
          />
        </g>
      )}
    </g>
  );
}
