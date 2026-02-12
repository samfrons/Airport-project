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
        {/* Runway marking pattern */}
        <pattern
          id="runway-centerline"
          patternUnits="userSpaceOnUse"
          width="40"
          height="4"
          patternTransform="rotate(0)"
        >
          <line
            x1="0"
            y1="2"
            x2="20"
            y2="2"
            stroke="var(--runway-marking)"
            strokeWidth="2"
          />
        </pattern>

        {/* Threshold marking pattern */}
        <pattern
          id="runway-threshold"
          patternUnits="userSpaceOnUse"
          width="8"
          height="30"
        >
          <rect x="0" y="0" width="4" height="30" fill="var(--runway-marking)" />
        </pattern>

        {/* Gradient for runway surface */}
        <linearGradient id="runway-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--runway-surface)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--runway-surface)" stopOpacity="0.9" />
        </linearGradient>

        {/* Drop shadow filter */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main transform group */}
      <g transform={transform}>
        {/* Background grass/terrain */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="var(--diagram-bg)"
        />

        {/* Terminals and buildings (render first, behind runways) */}
        {layout.terminals
          .filter((t) => t.type === 'apron')
          .map((terminal) => (
            <TerminalElement key={terminal.id} terminal={terminal} />
          ))}

        {/* Taxiways (render before runways so runways are on top) */}
        {layout.taxiways.map((taxiway) => (
          <TaxiwayElement key={taxiway.id} taxiway={taxiway} />
        ))}

        {/* Runways */}
        {layout.runways.map((runway) => (
          <RunwayElement key={runway.id} runway={runway} />
        ))}

        {/* Other terminals (hangars, parking, etc.) */}
        {layout.terminals
          .filter((t) => t.type !== 'apron')
          .map((terminal) => (
            <TerminalElement key={terminal.id} terminal={terminal} />
          ))}
      </g>

      {/* Fixed overlays (not affected by zoom/pan) */}
      <NorthArrow x={width - 60} y={60} />
      <ScaleBar x={60} y={height - 40} length={layout.scaleBarLength} />
    </svg>
  );
}
