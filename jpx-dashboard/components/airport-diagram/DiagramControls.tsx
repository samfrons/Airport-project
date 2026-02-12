'use client';

import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';

export function DiagramControls() {
  const { zoomIn, zoomOut, resetView, showNOTAMs, toggleNOTAMs, view } =
    useAirportDiagramStore();

  const zoomPercent = Math.round(view.zoom * 100);

  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1">
      {/* Zoom controls */}
      <div className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <button
          onClick={zoomIn}
          className="p-2 hover:bg-[var(--bg-raised)] transition-colors"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} className="text-[var(--text-secondary)]" />
        </button>
        <div className="border-t border-[var(--border-subtle)]" />
        <div className="px-2 py-1 text-[10px] text-center text-[var(--text-muted)] font-medium tabular-nums">
          {zoomPercent}%
        </div>
        <div className="border-t border-[var(--border-subtle)]" />
        <button
          onClick={zoomOut}
          className="p-2 hover:bg-[var(--bg-raised)] transition-colors"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Additional controls */}
      <div className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <button
          onClick={resetView}
          className="p-2 hover:bg-[var(--bg-raised)] transition-colors"
          title="Reset view"
          aria-label="Reset view"
        >
          <RotateCcw size={16} className="text-[var(--text-secondary)]" />
        </button>
        <div className="border-t border-[var(--border-subtle)]" />
        <button
          onClick={toggleNOTAMs}
          className={`p-2 transition-colors ${
            showNOTAMs
              ? 'bg-[var(--curfew-color)] text-white'
              : 'hover:bg-[var(--bg-raised)]'
          }`}
          title={showNOTAMs ? 'Hide NOTAMs' : 'Show NOTAMs'}
          aria-label={showNOTAMs ? 'Hide NOTAMs' : 'Show NOTAMs'}
        >
          <AlertTriangle
            size={16}
            className={showNOTAMs ? 'text-white' : 'text-[var(--text-secondary)]'}
          />
        </button>
      </div>
    </div>
  );
}
