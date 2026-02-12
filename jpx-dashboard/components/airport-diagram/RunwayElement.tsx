'use client';

import type { Runway } from '@/types/airportDiagram';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';
import { StatusIndicator } from './StatusIndicator';

interface RunwayElementProps {
  runway: Runway;
}

export function RunwayElement({ runway }: RunwayElementProps) {
  const { selection, setSelection, showTooltip, hideTooltip, showNOTAMs } =
    useAirportDiagramStore();

  const isSelected = selection.type === 'runway' && selection.id === runway.id;
  const isClosed = runway.status === 'closed';
  const isRestricted = runway.status === 'restricted';

  const handleClick = () => {
    setSelection({ type: 'runway', id: runway.id });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const details = [
      `${runway.length}' x ${runway.width}'`,
      `Surface: ${runway.surface}`,
      `Heading: ${runway.heading}°`,
    ];

    if (runway.thresholds[0].displaced) {
      details.push(`RWY ${runway.thresholds[0].designator}: ${runway.thresholds[0].displaced}' displaced`);
    }
    if (runway.thresholds[1].displaced) {
      details.push(`RWY ${runway.thresholds[1].designator}: ${runway.thresholds[1].displaced}' displaced`);
    }

    showTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      title: `Runway ${runway.name}`,
      details,
    });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  // Calculate threshold positions and label positions
  const [threshold1, threshold2] = runway.thresholds;

  return (
    <g className="runway-element">
      {/* Runway surface */}
      <path
        d={runway.path}
        fill="var(--runway-surface)"
        stroke={isSelected ? 'var(--accent)' : 'none'}
        strokeWidth={isSelected ? 3 : 0}
        className="cursor-pointer transition-colors"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        filter={isSelected ? 'url(#shadow)' : undefined}
      />

      {/* Centerline marking */}
      {runway.name === '10-28' && (
        <line
          x1={threshold1.coordinates.x + 50}
          y1={350}
          x2={threshold2.coordinates.x - 50}
          y2={350}
          stroke="var(--runway-marking)"
          strokeWidth="2"
          strokeDasharray="30 20"
          pointerEvents="none"
        />
      )}

      {runway.name === '16-34' && (
        <line
          x1={500}
          y1={threshold1.coordinates.y + 40}
          x2={500}
          y2={threshold2.coordinates.y - 40}
          stroke="var(--runway-marking)"
          strokeWidth="2"
          strokeDasharray="30 20"
          pointerEvents="none"
        />
      )}

      {/* Threshold 1 label */}
      <g className="pointer-events-none">
        <rect
          x={threshold1.coordinates.x - 18}
          y={runway.name === '10-28' ? 310 : threshold1.coordinates.y - 25}
          width="36"
          height="20"
          fill="var(--text-primary)"
        />
        <text
          x={threshold1.coordinates.x}
          y={runway.name === '10-28' ? 324 : threshold1.coordinates.y - 11}
          textAnchor="middle"
          fill="var(--bg-surface)"
          fontSize="12"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {threshold1.designator}
        </text>
      </g>

      {/* Threshold 2 label */}
      <g className="pointer-events-none">
        <rect
          x={threshold2.coordinates.x - 18}
          y={runway.name === '10-28' ? 370 : threshold2.coordinates.y + 5}
          width="36"
          height="20"
          fill="var(--text-primary)"
        />
        <text
          x={threshold2.coordinates.x}
          y={runway.name === '10-28' ? 384 : threshold2.coordinates.y + 19}
          textAnchor="middle"
          fill="var(--bg-surface)"
          fontSize="12"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {threshold2.designator}
        </text>
      </g>

      {/* Displaced threshold indicators */}
      {threshold1.displaced && (
        <g className="pointer-events-none">
          <line
            x1={runway.name === '10-28' ? threshold1.coordinates.x + 20 : threshold1.coordinates.x - 10}
            y1={runway.name === '10-28' ? 340 : threshold1.coordinates.y + 20}
            x2={runway.name === '10-28' ? threshold1.coordinates.x + 20 : threshold1.coordinates.x + 10}
            y2={runway.name === '10-28' ? 360 : threshold1.coordinates.y + 20}
            stroke="var(--runway-marking)"
            strokeWidth="3"
          />
        </g>
      )}

      {threshold2.displaced && (
        <g className="pointer-events-none">
          <line
            x1={runway.name === '10-28' ? threshold2.coordinates.x - 20 : threshold2.coordinates.x - 10}
            y1={runway.name === '10-28' ? 340 : threshold2.coordinates.y - 20}
            x2={runway.name === '10-28' ? threshold2.coordinates.x - 20 : threshold2.coordinates.x + 10}
            y2={runway.name === '10-28' ? 360 : threshold2.coordinates.y - 20}
            stroke="var(--runway-marking)"
            strokeWidth="3"
          />
        </g>
      )}

      {/* Status indicator for closed/restricted */}
      {(isClosed || isRestricted) && (
        <StatusIndicator
          status={runway.status}
          x={
            runway.name === '10-28'
              ? (threshold1.coordinates.x + threshold2.coordinates.x) / 2
              : threshold1.coordinates.x
          }
          y={
            runway.name === '10-28'
              ? 350
              : (threshold1.coordinates.y + threshold2.coordinates.y) / 2
          }
        />
      )}

      {/* NOTAM indicator */}
      {showNOTAMs && runway.notam && (
        <g className="pointer-events-none">
          <rect
            x={(threshold1.coordinates.x + threshold2.coordinates.x) / 2 - 40}
            y={runway.name === '10-28' ? 395 : 350}
            width="80"
            height="16"
            fill="var(--curfew-color)"
          />
          <text
            x={(threshold1.coordinates.x + threshold2.coordinates.x) / 2}
            y={runway.name === '10-28' ? 407 : 362}
            textAnchor="middle"
            fill="white"
            fontSize="9"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
          >
            NOTAM
          </text>
        </g>
      )}
    </g>
  );
}
