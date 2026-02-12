'use client';

import { useEffect } from 'react';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';
import { AirportDiagramSVG } from './AirportDiagramSVG';
import { DiagramControls } from './DiagramControls';
import { DiagramLegend } from './DiagramLegend';
import { DiagramTooltip } from './DiagramTooltip';

interface AirportDiagramProps {
  className?: string;
}

export function AirportDiagram({ className = '' }: AirportDiagramProps) {
  const { layout, loading, error, loadLayout, showLegend, tooltip } = useAirportDiagramStore();

  useEffect(() => {
    if (!layout) {
      loadLayout();
    }
  }, [layout, loadLayout]);

  if (loading) {
    return (
      <div className={`relative bg-[var(--diagram-bg)] border border-[var(--border-subtle)] ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[var(--text-tertiary)] text-sm">Loading airport diagram...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative bg-[var(--diagram-bg)] border border-[var(--border-subtle)] ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!layout) {
    return null;
  }

  return (
    <div className={`relative bg-[var(--diagram-bg)] border border-[var(--border-subtle)] overflow-hidden ${className}`}>
      {/* SVG Diagram */}
      <AirportDiagramSVG layout={layout} />

      {/* Controls */}
      <DiagramControls />

      {/* Legend */}
      {showLegend && <DiagramLegend />}

      {/* Tooltip */}
      {tooltip.visible && <DiagramTooltip {...tooltip} />}

      {/* Airport Info Overlay */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">
          {layout.icao}
        </div>
        <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
          {layout.name}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
          Elev {layout.elevation}&apos; MSL
        </div>
      </div>
    </div>
  );
}
