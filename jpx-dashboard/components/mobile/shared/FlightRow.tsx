'use client';

import { NoiseDbBadge } from './NoiseDbBadge';
import { TypeChip } from './TypeChip';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';

interface FlightRowProps {
  flight: Flight;
  onReport?: () => void;
}

export function FlightRow({ flight, onReport }: FlightRowProps) {
  const db = getNoiseDb(flight);
  const time = formatTime(flight.actual_on || flight.actual_off);

  // Build route string
  const route = flight.direction === 'arrival'
    ? `${flight.origin_code || '???'} → KJPX`
    : `KJPX → ${flight.destination_code || '???'}`;

  return (
    <div className="bg-raised p-3 flex items-center gap-3 mb-2">
      {/* dB badge */}
      <NoiseDbBadge db={db} size="md" showTilde />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-primary">
            {flight.registration || flight.ident || 'Unknown'}
          </span>
          <TypeChip category={flight.aircraft_category} model={flight.aircraft_type} />
        </div>
        <div className="text-[10px] text-tertiary mt-0.5">
          {route} · {time}
        </div>
      </div>

      {/* Report button */}
      {onReport && (
        <button
          onClick={onReport}
          className="bg-[#1A6B72] text-white text-[9px] font-bold px-3 py-1.5"
        >
          Report
        </button>
      )}
    </div>
  );
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });
  } catch {
    return '';
  }
}
