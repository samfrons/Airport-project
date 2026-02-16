'use client';

import { X } from 'lucide-react';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';

export function DiagramLegend() {
  const { toggleLegend } = useAirportDiagramStore();

  return (
    <div className="absolute top-3 right-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">
          Legend
        </span>
        <button
          onClick={toggleLegend}
          className="p-0.5 hover:bg-[var(--bg-raised)] transition-colors"
          aria-label="Close legend"
        >
          <X size={12} className="text-[var(--text-muted)]" />
        </button>
      </div>

      <div className="space-y-2">
        {/* Pavement */}
        <div className="space-y-1">
          <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Pavement</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 border border-[var(--text-primary)]" style={{ backgroundColor: 'var(--runway-surface)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Runway</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2" style={{ backgroundColor: 'var(--taxiway-surface)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Taxiway</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 border border-[var(--border-subtle)]" style={{ backgroundColor: 'var(--bg-inset)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Apron</span>
          </div>
        </div>

        {/* Structures */}
        <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
          <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Structures</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 border border-[var(--border-strong)]" style={{ backgroundColor: 'var(--bg-raised)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Terminal / Hangar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 border border-[var(--border-subtle)]" style={{ backgroundColor: 'var(--bg-surface)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">GA Parking</span>
          </div>
        </div>

        {/* Markings */}
        <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
          <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Markings</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, var(--runway-marking) 0, var(--runway-marking) 4px, transparent 4px, transparent 6px)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Centerline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-px">
              <div className="w-1 h-3" style={{ backgroundColor: 'var(--curfew-color)' }} />
              <div className="w-1 h-3" style={{ backgroundColor: 'var(--curfew-color)', opacity: 0.5 }} />
            </div>
            <span className="text-[9px] text-[var(--text-secondary)]">Hold Short</span>
          </div>
        </div>

        {/* Facilities */}
        <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
          <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Facilities</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--curfew-color)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Airport Beacon</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="4" fill="var(--status-open)" />
              <line x1="6" y1="6" x2="10" y2="3" stroke="var(--curfew-color)" strokeWidth="2" />
            </svg>
            <span className="text-[9px] text-[var(--text-secondary)]">Windsock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-[var(--text-tertiary)]" style={{ backgroundColor: 'var(--bg-surface)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">AWOS</span>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
          <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Status</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2" style={{ backgroundColor: 'var(--status-open)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Open</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2" style={{ backgroundColor: 'var(--status-closed)' }} />
            <span className="text-[9px] text-[var(--text-secondary)]">Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
