'use client';

import { useState } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: 'stats', label: 'Statistics' },
  { id: 'map', label: 'Flight Routes' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'breakdown', label: 'Aircraft Breakdown' },
  { id: 'scorecards', label: 'Operator Scorecards' },
  { id: 'weather', label: 'Weather Correlation' },
  { id: 'replay', label: 'Flight Replay' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'thresholds', label: 'Thresholds' },
  { id: 'violations', label: 'Violations' },
  { id: 'biodiversity', label: 'Biodiversity' },
  { id: 'complaints', label: 'Noise Reports' },
  { id: 'curfew', label: 'Hourly Distribution' },
  { id: 'flights', label: 'Flight Log' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 shadow-lg shadow-black/40 hover:bg-blue-500 transition-colors"
        aria-label="Navigation menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <nav
            className="absolute bottom-16 right-4 w-64 max-h-[70vh] overflow-y-auto bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-zinc-800">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                Jump to Section
              </p>
            </div>
            <ul className="py-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <span>{section.label}</span>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
