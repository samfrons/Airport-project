'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { NoiseDbBadge } from './NoiseDbBadge';
import { TypeChip } from './TypeChip';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import { buildComplaintUrl } from '@/lib/mobile/complaint';
import type { Flight } from '@/types/flight';

interface ViolationRowProps {
  flight: Flight;
  isRepeat?: boolean;
}

export function ViolationRow({ flight, isRepeat }: ViolationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const db = getNoiseDb(flight);
  const time = formatTime(flight.actual_on || flight.actual_off);

  // Build route string
  const route =
    flight.direction === 'arrival'
      ? `${flight.origin_code || '???'} → KJPX`
      : `KJPX → ${flight.destination_code || '???'}`;

  const handleReport = () => {
    const url = buildComplaintUrl(flight);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      {/* Main row - clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 border-b border-subtle flex items-center gap-2 text-left hover:bg-raised transition-colors"
      >
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

        {/* Chevron */}
        {expanded ? (
          <ChevronDown size={14} className="text-tertiary flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-tertiary flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="bg-raised border-b border-subtle px-4 py-3">
          {/* Flight details grid */}
          <div className="grid grid-cols-2 gap-3 text-[10px] mb-3">
            <div>
              <div className="text-tertiary mb-0.5">Route</div>
              <div className="font-semibold text-primary">{route}</div>
            </div>
            <div>
              <div className="text-tertiary mb-0.5">Aircraft</div>
              <div className="font-semibold text-primary">
                {flight.aircraft_type || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-tertiary mb-0.5">Est. Noise</div>
              <div className="font-semibold text-primary">{db} dB</div>
            </div>
            <div>
              <div className="text-tertiary mb-0.5">Direction</div>
              <div className="font-semibold text-primary capitalize">
                {flight.direction}
              </div>
            </div>
            {flight.origin_city && (
              <div className="col-span-2">
                <div className="text-tertiary mb-0.5">
                  {flight.direction === 'arrival' ? 'From' : 'To'}
                </div>
                <div className="font-semibold text-primary">
                  {flight.direction === 'arrival'
                    ? `${flight.origin_city} (${flight.origin_name || flight.origin_code})`
                    : `${flight.destination_city} (${flight.destination_name || flight.destination_code})`}
                </div>
              </div>
            )}
          </div>

          {/* Report button */}
          <button
            onClick={handleReport}
            className="w-full bg-red-600 text-white py-2.5 text-[11px] font-bold flex items-center justify-center gap-2"
          >
            <span>📢</span>
            Report This Violation
            <ExternalLink size={12} />
          </button>
        </div>
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
