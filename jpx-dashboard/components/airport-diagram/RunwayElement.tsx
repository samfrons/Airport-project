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
  const isMainRunway = runway.name === '10-28';
  const isAngledRunway = runway.name === '16-34';

  // Calculate centerline for angled runway
  const centerX1 = threshold1.coordinates.x;
  const centerY1 = threshold1.coordinates.y;
  const centerX2 = threshold2.coordinates.x;
  const centerY2 = threshold2.coordinates.y;

  // Calculate angle for rotated elements
  const angle = isAngledRunway ? Math.atan2(centerY2 - centerY1, centerX2 - centerX1) * (180 / Math.PI) : 0;

  return (
    <g className="runway-element">
      {/* Runway surface */}
      <path
        d={runway.path}
        fill="var(--runway-surface)"
        stroke={isSelected ? 'var(--accent)' : 'var(--text-primary)'}
        strokeWidth={isSelected ? 3 : 1}
        className="cursor-pointer transition-colors"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        filter={isSelected ? 'url(#shadow)' : undefined}
      />

      {/* Centerline marking for main runway */}
      {isMainRunway && (
        <line
          x1={threshold1.coordinates.x + 60}
          y1={480}
          x2={threshold2.coordinates.x - 60}
          y2={480}
          stroke="var(--runway-marking)"
          strokeWidth="2"
          strokeDasharray="40 20"
          pointerEvents="none"
        />
      )}

      {/* Centerline marking for angled runway */}
      {isAngledRunway && (
        <line
          x1={centerX1 + 15}
          y1={centerY1 + 40}
          x2={centerX2 - 10}
          y2={centerY2 - 40}
          stroke="var(--runway-marking)"
          strokeWidth="2"
          strokeDasharray="30 15"
          pointerEvents="none"
        />
      )}

      {/* Threshold 1 label (designator in circle for FAA style) */}
      <g className="pointer-events-none">
        {isMainRunway ? (
          <>
            {/* RWY 10 - left side */}
            <circle
              cx={threshold1.coordinates.x - 30}
              cy={480}
              r="18"
              fill="var(--bg-surface)"
              stroke="var(--text-primary)"
              strokeWidth="2"
            />
            <text
              x={threshold1.coordinates.x - 30}
              y={485}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize="14"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {threshold1.designator}
            </text>
          </>
        ) : (
          <>
            {/* RWY 16 - top of angled runway */}
            <circle
              cx={centerX1 - 25}
              cy={centerY1 - 10}
              r="16"
              fill="var(--bg-surface)"
              stroke="var(--text-primary)"
              strokeWidth="2"
            />
            <text
              x={centerX1 - 25}
              y={centerY1 - 5}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize="12"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {threshold1.designator}
            </text>
          </>
        )}
      </g>

      {/* Threshold 2 label */}
      <g className="pointer-events-none">
        {isMainRunway ? (
          <>
            {/* RWY 28 - right side */}
            <circle
              cx={threshold2.coordinates.x + 30}
              cy={480}
              r="18"
              fill="var(--bg-surface)"
              stroke="var(--text-primary)"
              strokeWidth="2"
            />
            <text
              x={threshold2.coordinates.x + 30}
              y={485}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize="14"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {threshold2.designator}
            </text>
          </>
        ) : (
          <>
            {/* RWY 34 - bottom of angled runway */}
            <circle
              cx={centerX2 + 25}
              cy={centerY2 + 10}
              r="16"
              fill="var(--bg-surface)"
              stroke="var(--text-primary)"
              strokeWidth="2"
            />
            <text
              x={centerX2 + 25}
              y={centerY2 + 15}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize="12"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {threshold2.designator}
            </text>
          </>
        )}
      </g>

      {/* Threshold stripes (piano keys) for main runway */}
      {isMainRunway && (
        <>
          {/* RWY 10 threshold stripes */}
          <g className="pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`stripe-10-${i}`}
                x={threshold1.coordinates.x + 10}
                y={463 + i * 8}
                width="30"
                height="5"
                fill="var(--runway-marking)"
              />
            ))}
          </g>
          {/* RWY 28 threshold stripes */}
          <g className="pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`stripe-28-${i}`}
                x={threshold2.coordinates.x - 40}
                y={463 + i * 8}
                width="30"
                height="5"
                fill="var(--runway-marking)"
              />
            ))}
          </g>
        </>
      )}

      {/* Displaced threshold markers */}
      {threshold1.displaced && isAngledRunway && (
        <g className="pointer-events-none">
          {/* Arrows pointing toward runway */}
          <path
            d={`M ${centerX1 + 5},${centerY1 + 30} L ${centerX1 + 15},${centerY1 + 50} L ${centerX1 + 25},${centerY1 + 30}`}
            fill="none"
            stroke="var(--runway-marking)"
            strokeWidth="2"
          />
        </g>
      )}

      {threshold2.displaced && isMainRunway && (
        <g className="pointer-events-none">
          {/* Displaced threshold line for RWY 28 */}
          <line
            x1={threshold2.coordinates.x - 25}
            y1={462}
            x2={threshold2.coordinates.x - 25}
            y2={498}
            stroke="var(--runway-marking)"
            strokeWidth="3"
          />
          {/* Arrows pointing away from threshold */}
          <path
            d="M 960,470 L 945,480 L 960,490"
            fill="none"
            stroke="var(--runway-marking)"
            strokeWidth="2"
          />
        </g>
      )}

      {/* Aiming point markers for main runway */}
      {isMainRunway && (
        <>
          <rect x="240" y="468" width="60" height="4" fill="var(--runway-marking)" className="pointer-events-none" />
          <rect x="240" y="488" width="60" height="4" fill="var(--runway-marking)" className="pointer-events-none" />
          <rect x="800" y="468" width="60" height="4" fill="var(--runway-marking)" className="pointer-events-none" />
          <rect x="800" y="488" width="60" height="4" fill="var(--runway-marking)" className="pointer-events-none" />
        </>
      )}

      {/* Status indicator for closed/restricted */}
      {(isClosed || isRestricted) && (
        <StatusIndicator
          status={runway.status}
          x={(centerX1 + centerX2) / 2}
          y={(centerY1 + centerY2) / 2}
        />
      )}

      {/* NOTAM indicator */}
      {showNOTAMs && runway.notam && (
        <g className="pointer-events-none">
          <rect
            x={(centerX1 + centerX2) / 2 - 30}
            y={isMainRunway ? 510 : (centerY1 + centerY2) / 2 + 20}
            width="60"
            height="14"
            fill="var(--curfew-color)"
          />
          <text
            x={(centerX1 + centerX2) / 2}
            y={isMainRunway ? 521 : (centerY1 + centerY2) / 2 + 31}
            textAnchor="middle"
            fill="white"
            fontSize="8"
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
