'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { NoiseDbBadge } from './NoiseDbBadge';
import { TypeChip } from './TypeChip';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import { buildComplaintUrl } from '@/lib/mobile/complaint';
import type { Flight } from '@/types/flight';

interface FlightRowProps {
  flight: Flight;
  showReportButton?: boolean;
}

export function FlightRow({ flight, showReportButton = true }: FlightRowProps) {
  const [expanded, setExpanded] = useState(false);
  const db = getNoiseDb(flight);
  const time = formatTime(flight.actual_on || flight.actual_off);

  // Build route string
  const route =
    flight.direction === 'arrival'
      ? `${flight.origin_code || '???'} → KJPX`
      : `KJPX → ${flight.destination_code || '???'}`;

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildComplaintUrl(flight);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-raised mb-2">
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        {/* dB badge */}
        <NoiseDbBadge db={db} size="md" showTilde />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-primary">
              {flight.registration || flight.ident || 'Unknown'}
            </span>
            <TypeChip
              category={flight.aircraft_category}
              model={flight.aircraft_type}
            />
          </div>
          <div className="text-[10px] text-tertiary mt-0.5">
            {route} · {time}
          </div>
        </div>

        {/* Report button (quick action) */}
        {showReportButton && (
          <button
            onClick={handleReport}
            className="bg-[#1A6B72] text-white text-[9px] font-bold px-3 py-1.5 flex items-center gap-1"
          >
            Report
          </button>
        )}

        {/* Chevron */}
        {expanded ? (
          <ChevronDown size={14} className="text-tertiary flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-tertiary flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="border-t border-subtle pt-3">
            {/* Flight details grid */}
            <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
              <div>
                <div className="text-tertiary mb-0.5">Operator</div>
                <div className="font-semibold text-primary">
                  {flight.operator || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-tertiary mb-0.5">Aircraft</div>
                <div className="font-semibold text-primary">
                  {flight.aircraft_type || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-tertiary mb-0.5">Est. Noise</div>
                <div className="font-semibold text-primary">~{db} dB</div>
              </div>
              <div>
                <div className="text-tertiary mb-0.5">Direction</div>
                <div className="font-semibold text-primary capitalize">
                  {flight.direction}
                </div>
              </div>
              {(flight.origin_city || flight.destination_city) && (
                <div className="col-span-2">
                  <div className="text-tertiary mb-0.5">
                    {flight.direction === 'arrival' ? 'Origin' : 'Destination'}
                  </div>
                  <div className="font-semibold text-primary">
                    {flight.direction === 'arrival'
                      ? `${flight.origin_city || ''} ${flight.origin_name ? `(${flight.origin_name})` : ''}`
                      : `${flight.destination_city || ''} ${flight.destination_name ? `(${flight.destination_name})` : ''}`}
                  </div>
                </div>
              )}
            </div>

            {/* Full report button */}
            <button
              onClick={handleReport}
              className="w-full bg-red-600 text-white py-2 text-[11px] font-bold flex items-center justify-center gap-2"
            >
              📢 File Complaint for This Flight
              <ExternalLink size={12} />
            </button>
          </div>
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
