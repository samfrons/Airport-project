'use client';

import { X } from 'lucide-react';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';

export function DiagramLegend() {
  const { toggleLegend } = useAirportDiagramStore();

  const legendItems = [
    { color: 'var(--runway-surface)', label: 'Runway' },
    { color: 'var(--taxiway-surface)', label: 'Taxiway' },
    { color: 'var(--bg-raised)', label: 'Terminal/Hangar' },
    { color: 'var(--bg-inset)', label: 'Apron' },
    { color: 'var(--status-open)', label: 'Open' },
    { color: 'var(--status-closed)', label: 'Closed' },
  ];

  return (
    <div className="absolute top-3 right-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 min-w-[140px]">
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

      <div className="space-y-1.5">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-4 h-3"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-[var(--text-secondary)]">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border-subtle)] mt-2 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[var(--runway-marking)]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--runway-marking) 0, var(--runway-marking) 4px, transparent 4px, transparent 8px)' }} />
          <span className="text-[10px] text-[var(--text-secondary)]">
            Centerline
          </span>
        </div>
      </div>
    </div>
  );
}
