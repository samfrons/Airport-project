'use client';

import { useMemo } from 'react';
import { TYPE_COLORS } from '@/lib/mobile/colors';
import type { Flight } from '@/types/flight';

interface AircraftTypeBarProps {
  flights: Flight[];
}

export function AircraftTypeBar({ flights }: AircraftTypeBarProps) {
  const counts = useMemo(() => {
    let heli = 0;
    let jet = 0;
    let fixed = 0;

    for (const f of flights) {
      if (f.aircraft_category === 'helicopter') heli++;
      else if (f.aircraft_category === 'jet') jet++;
      else fixed++;
    }

    return { heli, jet, fixed, total: heli + jet + fixed };
  }, [flights]);

  if (counts.total === 0) {
    return null;
  }

  return (
    <div className="px-4">
      <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
        Aircraft Types
      </div>

      {/* Stacked bar */}
      <div className="flex h-5 overflow-hidden">
        {counts.heli > 0 && (
          <div
            className="h-full"
            style={{
              flex: counts.heli,
              backgroundColor: TYPE_COLORS.helicopter,
            }}
          />
        )}
        {counts.jet > 0 && (
          <div
            className="h-full"
            style={{
              flex: counts.jet,
              backgroundColor: TYPE_COLORS.jet,
            }}
          />
        )}
        {counts.fixed > 0 && (
          <div
            className="h-full"
            style={{
              flex: counts.fixed,
              backgroundColor: TYPE_COLORS.fixed_wing,
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-[9px] text-tertiary">
        <span>
          <span
            className="font-bold"
            style={{ color: TYPE_COLORS.helicopter }}
          >
            ●
          </span>{' '}
          Heli {counts.heli}
        </span>
        <span>
          <span className="font-bold" style={{ color: TYPE_COLORS.jet }}>
            ●
          </span>{' '}
          Jet {counts.jet}
        </span>
        <span>
          <span
            className="font-bold"
            style={{ color: TYPE_COLORS.fixed_wing }}
          >
            ●
          </span>{' '}
          Fixed {counts.fixed}
        </span>
      </div>

      <div className="mt-2 text-[9px] text-muted italic">
        Noise dB scale (red–green) shown on individual flight badges only
      </div>
    </div>
  );
}
