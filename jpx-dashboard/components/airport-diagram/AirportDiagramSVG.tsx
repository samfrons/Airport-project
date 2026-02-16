'use client';

import { useRef } from 'react';
import type { AirportLayout } from '@/types/airportDiagram';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';
import { useDiagramInteractions } from '@/hooks/useDiagramInteractions';
import { RunwayElement } from './RunwayElement';
import { TaxiwayElement } from './TaxiwayElement';
import { TerminalElement } from './TerminalElement';
import { NorthArrow } from './NorthArrow';
import { ScaleBar } from './ScaleBar';
import { kjpxAnnotations } from '@/data/airport/kjpxLayout';

interface AirportDiagramSVGProps {
  layout: AirportLayout;
}

export function AirportDiagramSVG({ layout }: AirportDiagramSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { view } = useAirportDiagramStore();
  const { cursor } = useDiagramInteractions(svgRef);

  const { width, height } = layout.viewBox;

  // Calculate the transform based on zoom and pan
  const transform = `translate(${view.panX}, ${view.panY}) scale(${view.zoom})`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ cursor }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Definitions */}
      <defs>
        {/* Drop shadow filter */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main transform group */}
      <g transform={transform}>
        {/* Background */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="var(--diagram-bg)"
        />

        {/* Airport property boundary */}
        {kjpxAnnotations.airportBoundary && (
          <path
            d={kjpxAnnotations.airportBoundary.path}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            className="pointer-events-none"
          />
        )}

        {/* Roads (background layer) */}
        {kjpxAnnotations.roads.map((road, i) => (
          <g key={`road-${i}`} className="pointer-events-none">
            <path
              d={road.path}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="2"
              strokeDasharray="8 4"
            />
          </g>
        ))}

        {/* Road labels with rotation */}
        {kjpxAnnotations.roads.map((road, i) => (
          <text
            key={`road-label-${i}`}
            x={road.labelX}
            y={road.labelY}
            fill="var(--text-muted)"
            fontSize="9"
            fontFamily="Inter, sans-serif"
            fontStyle="italic"
            className="pointer-events-none"
            transform={road.rotation ? `rotate(${road.rotation}, ${road.labelX}, ${road.labelY})` : undefined}
          >
            {road.name}
          </text>
        ))}

        {/* Terrain labels */}
        {kjpxAnnotations.terrain.map((terrain, i) => (
          <text
            key={`terrain-${i}`}
            x={terrain.x}
            y={terrain.y}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fontStyle="italic"
            className="pointer-events-none"
          >
            {terrain.label}
          </text>
        ))}

        {/* Woods Line */}
        {kjpxAnnotations.woodsLine && (
          <g className="pointer-events-none">
            <path
              d={kjpxAnnotations.woodsLine.path}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text
              x={kjpxAnnotations.woodsLine.labelX}
              y={kjpxAnnotations.woodsLine.labelY}
              fill="var(--text-muted)"
              fontSize="8"
              fontFamily="Inter, sans-serif"
              fontStyle="italic"
            >
              {kjpxAnnotations.woodsLine.label}
            </text>
          </g>
        )}

        {/* Power line */}
        {kjpxAnnotations.powerLine && (
          <g className="pointer-events-none">
            <path
              d={kjpxAnnotations.powerLine.path}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </g>
        )}

        {/* Power line towers (triangle symbols) */}
        {kjpxAnnotations.powerLineTowers?.map((tower, i) => (
          <path
            key={`tower-${i}`}
            d={`M ${tower.x},${tower.y - 15} L ${tower.x - 8},${tower.y} L ${tower.x + 8},${tower.y} Z`}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1"
            className="pointer-events-none"
          />
        ))}

        {/* Perimeter structures (small buildings) */}
        {kjpxAnnotations.perimeterStructures?.map((struct, i) => (
          <path
            key={`struct-${i}`}
            d={struct.path}
            fill="var(--text-secondary)"
            stroke="var(--border-strong)"
            strokeWidth="0.5"
            className="pointer-events-none"
          />
        ))}

        {/* Facility labels with icons */}
        {kjpxAnnotations.facilities.map((facility, i) => (
          <g key={`facility-${i}`} className="pointer-events-none">
            {facility.icon === 'tower' && (
              <>
                <line
                  x1={facility.x}
                  y1={facility.y}
                  x2={facility.x}
                  y2={facility.y - 20}
                  stroke="var(--text-tertiary)"
                  strokeWidth="1"
                />
                <circle
                  cx={facility.x}
                  cy={facility.y - 25}
                  r="6"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="1"
                />
              </>
            )}
            {facility.icon === 'building' && (
              <rect
                x={facility.x - 15}
                y={facility.y + 5}
                width="30"
                height="20"
                fill="none"
                stroke="var(--text-tertiary)"
                strokeWidth="0.5"
              />
            )}
            <text
              x={facility.x + (facility.icon === 'tower' ? 15 : 0)}
              y={facility.y}
              fill="var(--text-muted)"
              fontSize="8"
              fontFamily="Inter, sans-serif"
            >
              {facility.label.split('\n').map((line, j) => (
                <tspan key={j} x={facility.x + (facility.icon === 'tower' ? 15 : 0)} dy={j === 0 ? 0 : 10}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}

        {/* Terminals and buildings (aprons first - behind runways) */}
        {layout.terminals
          .filter((t) => t.type === 'apron')
          .map((terminal) => (
            <TerminalElement key={terminal.id} terminal={terminal} />
          ))}

        {/* Hangars (black filled buildings) */}
        {kjpxAnnotations.hangars?.map((hangar, i) => (
          <path
            key={`hangar-${i}`}
            d={hangar.path}
            fill="var(--text-primary)"
            stroke="var(--border-strong)"
            strokeWidth="0.5"
            className="pointer-events-none"
          />
        ))}

        {/* Taxiways */}
        {layout.taxiways.map((taxiway) => (
          <TaxiwayElement key={taxiway.id} taxiway={taxiway} showLabel={false} />
        ))}

        {/* Runways */}
        {layout.runways.map((runway) => (
          <RunwayElement key={runway.id} runway={runway} />
        ))}

        {/* Taxiway path labels (TW A, TW B, etc.) */}
        {kjpxAnnotations.taxiwayPathLabels?.map((label, i) => (
          <text
            key={`twy-path-label-${i}`}
            x={label.x}
            y={label.y}
            fill="var(--text-secondary)"
            fontSize="8"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
            textAnchor="middle"
            transform={label.rotation ? `rotate(${label.rotation}, ${label.x}, ${label.y})` : undefined}
            className="pointer-events-none"
          >
            {label.text}
          </text>
        ))}

        {/* Taxiway labels (single letter in circle) */}
        {kjpxAnnotations.taxiwayLabels.map((label, i) => (
          <g key={`twy-label-${i}`} className="pointer-events-none">
            <circle
              cx={label.x}
              cy={label.y}
              r="12"
              fill="var(--taxiway-surface)"
              stroke="var(--bg-surface)"
              strokeWidth="2"
            />
            <text
              x={label.x}
              y={label.y + 4}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {label.letter}
            </text>
          </g>
        ))}

        {/* Runway dimension labels */}
        {kjpxAnnotations.runwayLabels.map((label, i) => (
          <text
            key={`rwy-label-${i}`}
            x={label.x}
            y={label.y}
            fill="var(--text-secondary)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
            textAnchor="middle"
            transform={label.rotation ? `rotate(${label.rotation}, ${label.x}, ${label.y})` : undefined}
            className="pointer-events-none"
          >
            {label.text}
          </text>
        ))}

        {/* Runway name labels on pavement */}
        {kjpxAnnotations.runwayNameLabels?.map((label, i) => (
          <text
            key={`rwy-name-${i}`}
            x={label.x}
            y={label.y}
            fill="var(--runway-marking)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            textAnchor="middle"
            opacity="0.6"
            transform={label.rotation ? `rotate(${label.rotation}, ${label.x}, ${label.y})` : undefined}
            className="pointer-events-none"
          >
            {label.text}
          </text>
        ))}

        {/* Threshold elevation labels */}
        {kjpxAnnotations.thresholdLabels.map((label, i) => (
          <g key={`threshold-label-${i}`} className="pointer-events-none">
            {label.lines.map((line, j) => (
              <text
                key={`${i}-${j}`}
                x={label.x}
                y={label.y + j * 10}
                fill="var(--text-tertiary)"
                fontSize="7"
                fontFamily="Inter, sans-serif"
                textAnchor={label.x < 600 ? 'start' : 'end'}
              >
                {line}
              </text>
            ))}
          </g>
        ))}

        {/* Other terminals (hangars, parking, etc.) */}
        {layout.terminals
          .filter((t) => t.type !== 'apron')
          .map((terminal) => (
            <TerminalElement key={terminal.id} terminal={terminal} />
          ))}

        {/* BCN labels */}
        {kjpxAnnotations.beaconLabels.map((bcn, i) => (
          <text
            key={`bcn-${i}`}
            x={bcn.x}
            y={bcn.y}
            fill="var(--text-muted)"
            fontSize="8"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            className="pointer-events-none"
          >
            {bcn.label}
          </text>
        ))}

        {/* AWOS label */}
        {kjpxAnnotations.awosLabel && (
          <text
            x={kjpxAnnotations.awosLabel.x}
            y={kjpxAnnotations.awosLabel.y}
            fill="var(--text-muted)"
            fontSize="8"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            className="pointer-events-none"
          >
            {kjpxAnnotations.awosLabel.label}
          </text>
        )}

        {/* Windsock label */}
        {kjpxAnnotations.windsockLabel && (
          <g className="pointer-events-none">
            {/* Windsock symbol */}
            <circle
              cx={kjpxAnnotations.windsockLabel.x - 20}
              cy={kjpxAnnotations.windsockLabel.y}
              r="4"
              fill="var(--status-open)"
            />
            <line
              x1={kjpxAnnotations.windsockLabel.x - 20}
              y1={kjpxAnnotations.windsockLabel.y}
              x2={kjpxAnnotations.windsockLabel.x - 10}
              y2={kjpxAnnotations.windsockLabel.y - 5}
              stroke="var(--curfew-color)"
              strokeWidth="2"
            />
            <text
              x={kjpxAnnotations.windsockLabel.x}
              y={kjpxAnnotations.windsockLabel.y + 3}
              fill="var(--text-muted)"
              fontSize="7"
              fontFamily="Inter, sans-serif"
            >
              {kjpxAnnotations.windsockLabel.label}
            </text>
          </g>
        )}

        {/* GA Parking tiedown spots */}
        <g className="pointer-events-none">
          {/* Row 1 of tiedowns */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={`tiedown-1-${i}`}
              x={910 + i * 24}
              y={275}
              width="20"
              height="28"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
          ))}
          {/* Row 2 of tiedowns */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={`tiedown-2-${i}`}
              x={910 + i * 24}
              y={308}
              width="20"
              height="28"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
          ))}
          {/* Row 3 of tiedowns */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={`tiedown-3-${i}`}
              x={910 + i * 24}
              y={341}
              width="20"
              height="24"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Hold short lines on taxiways */}
        <g className="pointer-events-none">
          {/* Hold short before RWY 10-28 on TWB */}
          <line x1="253" y1="508" x2="267" y2="508" stroke="var(--curfew-color)" strokeWidth="2" />
          <line x1="253" y1="512" x2="267" y2="512" stroke="var(--curfew-color)" strokeWidth="1" strokeDasharray="3 2" />

          {/* Hold short before RWY 10-28 on TWC */}
          <line x1="413" y1="508" x2="427" y2="508" stroke="var(--curfew-color)" strokeWidth="2" />
          <line x1="413" y1="512" x2="427" y2="512" stroke="var(--curfew-color)" strokeWidth="1" strokeDasharray="3 2" />

          {/* Hold short before RWY 10-28 on TWF */}
          <line x1="693" y1="455" x2="707" y2="455" stroke="var(--curfew-color)" strokeWidth="2" />

          {/* Hold short before RWY 10-28 on TWE */}
          <line x1="763" y1="455" x2="777" y2="455" stroke="var(--curfew-color)" strokeWidth="2" />

          {/* Hold short before RWY 10-28 on TWD */}
          <line x1="813" y1="455" x2="827" y2="455" stroke="var(--curfew-color)" strokeWidth="2" />
        </g>
      </g>

      {/* Fixed overlays (not affected by zoom/pan) */}
      <NorthArrow x={width - 80} y={80} />
      <ScaleBar x={80} y={height - 50} length={layout.scaleBarLength} />

      {/* Title */}
      <text
        x={width / 2}
        y={height - 30}
        fill="var(--text-primary)"
        fontSize="16"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        textAnchor="middle"
        letterSpacing="0.1em"
      >
        EAST HAMPTON TOWN
      </text>
      <text
        x={width / 2}
        y={height - 12}
        fill="var(--text-primary)"
        fontSize="14"
        fontFamily="Inter, sans-serif"
        fontWeight="600"
        textAnchor="middle"
        letterSpacing="0.15em"
      >
        AIRPORT DIAGRAM
      </text>
    </svg>
  );
}
