'use client';

import { ChevronRight } from 'lucide-react';
import { NoiseDbBadge } from './NoiseDbBadge';
import { TypeChip } from './TypeChip';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';

interface ViolationRowProps {
  flight: Flight;
  isRepeat?: boolean;
}

export function ViolationRow({ flight, isRepeat }: ViolationRowProps) {
  const db = getNoiseDb(flight);
  const time = formatTime(flight.actual_on || flight.actual_off);

  return (
    <div className="px-4 py-2.5 border-b border-subtle flex items-center gap-2">
      {/* dB badge */}
      <NoiseDbBadge db={db} size="md" />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-primary">
            {flight.registration || flight.ident || 'Unknown'}
          </span>
          <TypeChip category={flight.aircraft_category} />
          {isRepeat && (
            <span className="text-[9px] font-extrabold px-1 py-0.5 bg-orange-500 text-white">
              2×
            </span>
          )}
        </div>
        <div className="text-[10px] text-tertiary mt-0.5">
          {flight.operator || 'Unknown'} · {flight.operation_date} · {time}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight size={14} className="text-tertiary flex-shrink-0" />
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
